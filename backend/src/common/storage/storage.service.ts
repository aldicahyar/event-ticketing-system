import { Readable } from 'node:stream';

/**
 * A file ready to be persisted by a StorageService.
 * `content` is either a readable stream (from a multipart upload) or a Buffer.
 */
export interface StorageInput {
  originalName: string;
  mimeType: string;
  content: Readable | Buffer;
}

/**
 * Result of a successful save.
 */
export interface StoredFile {
  /** Unique name on the backing store (used later to delete). */
  filename: string;
  /** Public URL path the frontend can render, e.g. "/uploads/a1b2.webp". */
  url: string;
  /** Size in bytes actually written. */
  size: number;
}

/**
 * Abstract storage boundary. The rest of the app depends only on this token,
 * so swapping local disk for S3/MinIO later is a one-file change (provide a
 * different implementation in StorageModule) with no controller/service edits.
 */
export abstract class StorageService {
  abstract save(input: StorageInput): Promise<StoredFile>;
  abstract delete(filename: string): Promise<void>;
}
