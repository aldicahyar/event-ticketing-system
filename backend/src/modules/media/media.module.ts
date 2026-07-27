import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  // RbacModule provides RbacService for PermissionsGuard.
  // StorageService comes from the global StorageModule.
  imports: [RbacModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
