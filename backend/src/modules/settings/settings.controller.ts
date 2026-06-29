import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateTierSettingDto, UpdateTaxSettingDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../auth/dto/auth.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active system settings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return settings' })
  async getSettings() {
    const data = await this.settingsService.getSettings();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'System settings retrieved successfully',
    };
  }

  @Patch('tier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update ticket tier configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tier configuration successfully updated' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource' })
  async updateTierSetting(
    @Body() dto: UpdateTierSettingDto,
    @CurrentUser() user: any,
  ) {
    const updaterName = user.name || user.email || 'admin';
    const item = await this.settingsService.updateTierSetting(dto, updaterName);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: item,
      message: `Tier ${dto.id} configuration updated successfully`,
    };
  }

  @Patch('tax')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tax configuration (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tax configuration successfully updated' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource' })
  async updateTaxSetting(
    @Body() dto: UpdateTaxSettingDto,
    @CurrentUser() user: any,
  ) {
    const updaterName = user.name || user.email || 'admin';
    const item = await this.settingsService.updateTaxSetting(dto, updaterName);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: item,
      message: 'Tax configuration updated successfully',
    };
  }
}
