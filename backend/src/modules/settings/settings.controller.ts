import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateTierSettingDto, UpdateTaxSettingDto } from './dto/update-settings.dto';
import { CreatePerkDto, UpdatePerkDto } from './dto/perk.dto';
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

  @Get('perks/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active perks and facilities grouped by type (public)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return grouped active perks' })
  async getActivePerksGrouped() {
    const data = await this.settingsService.getActivePerksGrouped();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'Active perks retrieved successfully',
    };
  }

  @Get('perks')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('TIER_SETTINGS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all perks and facilities (admin)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return all perks' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden resource' })
  async getAllPerks() {
    const data = await this.settingsService.getAllPerks();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data,
      message: 'All perks retrieved successfully',
    };
  }

  @Post('perks')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('TIER_SETTINGS')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new perk or facility' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Perk successfully created' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Label already exists' })
  async createPerk(@Body() dto: CreatePerkDto) {
    const item = await this.settingsService.createPerk(dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      data: item,
      message: `Perk '${dto.label}' created successfully`,
    };
  }

  @Patch('perks/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('TIER_SETTINGS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing perk or facility' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Perk successfully updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Perk not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Label already exists' })
  async updatePerk(@Param('id') id: string, @Body() dto: UpdatePerkDto) {
    const item = await this.settingsService.updatePerk(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      data: item,
      message: `Perk ${id} updated successfully`,
    };
  }

  @Post('perks/:id/delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermission('TIER_SETTINGS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a perk or facility' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Perk successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Perk not found' })
  async deletePerk(@Param('id') id: string) {
    await this.settingsService.deletePerk(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Perk ${id} deleted successfully`,
    };
  }
}
