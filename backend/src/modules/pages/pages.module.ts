import { Module } from '@nestjs/common';
import { PagesController, PublicPagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { HtmlSanitizerService } from '../../common/security/html-sanitizer.service';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [RbacModule], // RbacService for PermissionsGuard
  controllers: [PagesController, PublicPagesController],
  providers: [PagesService, HtmlSanitizerService],
  exports: [PagesService],
})
export class PagesModule {}
