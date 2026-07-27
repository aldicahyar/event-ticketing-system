import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink, stat } from 'node:fs/promises';
import { extname, join, basename } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { StorageService, StorageInput, StoredFile } from './storage.service';

/**
 * Disk-backed StorageService. Files are written under `UPLOAD_DIR`
 * (default `<cwd>/uploads`) and served statically at `UPLOAD_URL_PREFIX`
 * (default `/uploads`) — see main.ts where @fastify/static is registered.
 */
@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly urlPrefix: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.uploadDir = this.config.get<string>('UPLOAD_DIR') || join(process.cwd(), 'uploads');
    const prefix = this.config.get<string>('UPLOAD_URL_PREFIX') || '/uploads';
    // Normalize to a leading-slash, no-trailing-slash prefix.
    this.urlPrefix = '/' + prefix.replace(/^\/+|\/+$/g, '');
  }

  async save(input: StorageInput): Promise<StoredFile> {
    await mkdir(this.uploadDir, { recursive: true });

    const ext = extname(input.originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    const destPath = join(this.uploadDir, filename);

    const source =
      input.content instanceof Readable ? input.content : Readable.from(input.content);
    await pipeline(source, createWriteStream(destPath));

    const { size } = await stat(destPath);

    return {
      filename,
      url: `${this.urlPrefix}/${filename}`,
      size,
    };
  }

  async delete(filename: string): Promise<void> {
    // Guard against path traversal — only ever touch the bare filename.
    const safe = basename(filename);
    try {
      await unlink(join(this.uploadDir, safe));
    } catch (err: any) {
      // Missing file is fine (already gone); log anything else and continue so a
      // dangling DB row can still be removed.
      if (err?.code !== 'ENOENT') {
        this.logger.warn(`Failed to delete file '${safe}': ${err?.message}`);
      }
    }
  }
}
