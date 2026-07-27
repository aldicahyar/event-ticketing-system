import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';

/**
 * Global provider for the StorageService boundary.
 * To move to S3/MinIO later, swap `useClass` for an S3StorageService — nothing
 * that injects StorageService needs to change.
 */
@Global()
@Module({
  providers: [{ provide: StorageService, useClass: LocalStorageService }],
  exports: [StorageService],
})
export class StorageModule {}
