import { Controller, Get, Patch, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateTierSettingDto, UpdateTaxSettingDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('TIER_SETTINGS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update ticket tier configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tier configuration successfully updated' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource' })
  async updateTierSetting(@Body() dto: UpdateTierSettingDto, @CurrentUser() user: any) {
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('TAX_SETTINGS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tax configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tax configuration updated successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource' })
  async updateTaxSetting(@Body() dto: UpdateTaxSettingDto, @CurrentUser() user: any) {
    const updaterName = user.name || user.email || 'admin';
    const item = await this.settingsService.updateTaxSetting(dto, updaterName);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: item,
      message: `Tax configuration updated successfully`,
    };
  }
}
