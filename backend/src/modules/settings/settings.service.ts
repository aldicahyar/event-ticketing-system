import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { UpdateTierSettingDto, UpdateTaxSettingDto } from './dto/update-settings.dto';
import { SeatType } from '@prisma/client';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed default settings if they do not exist
    await this.seedDefaultSettings();
  }

  private async seedDefaultSettings() {
    // 1. Seed TicketTierSettings
    const tierCount = await this.prisma.ticketTierSetting.count();
    if (tierCount === 0) {
      await this.prisma.ticketTierSetting.createMany({
        data: [
          { id: SeatType.VIP, ratio: 0.2, multiplier: 2, status: 'ACTIVE', createdBy: 'system', updatedBy: 'system' },
          { id: SeatType.PREMIUM, ratio: 0.5, multiplier: 1.5, status: 'ACTIVE', createdBy: 'system', updatedBy: 'system' },
          { id: SeatType.REGULAR, ratio: 1, multiplier: 1, status: 'ACTIVE', createdBy: 'system', updatedBy: 'system' },
        ],
      });
      console.log('Seeded default TicketTierSettings');
    }

    // 2. Seed TaxSettings
    const taxCount = await this.prisma.taxSetting.count();
    if (taxCount === 0) {
      await this.prisma.taxSetting.create({
        data: { id: 'default', ppnPercent: 11, status: 'ACTIVE', createdBy: 'system', updatedBy: 'system' },
      });
      console.log('Seeded default TaxSetting');
    }
  }

  async getSettings() {
    const [tiers, tax] = await Promise.all([
      this.prisma.ticketTierSetting.findMany({
        orderBy: { ratio: 'asc' },
      }),
      this.prisma.taxSetting.findUnique({
        where: { id: 'default' },
      }),
    ]);

    return {
      tiers,
      tax: tax || { id: 'default', ppnPercent: 11, status: 'ACTIVE', createdBy: 'system', updatedBy: 'system' },
    };
  }

  async getActiveTiers() {
    return this.prisma.ticketTierSetting.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { ratio: 'asc' },
    });
  }

  async getActiveTax() {
    const tax = await this.prisma.taxSetting.findFirst({
      where: { id: 'default', status: 'ACTIVE' },
    });
    return tax || { ppnPercent: 0 }; // If inactive, default to 0% PPN
  }

  async updateTierSetting(dto: UpdateTierSettingDto, adminName: string) {
    return this.prisma.ticketTierSetting.upsert({
      where: { id: dto.id },
      update: {
        ratio: dto.ratio,
        multiplier: dto.multiplier,
        status: dto.status || 'ACTIVE',
        updatedBy: adminName,
      },
      create: {
        id: dto.id,
        ratio: dto.ratio,
        multiplier: dto.multiplier,
        status: dto.status || 'ACTIVE',
        createdBy: adminName,
        updatedBy: adminName,
      },
    });
  }

  async updateTaxSetting(dto: UpdateTaxSettingDto, adminName: string) {
    return this.prisma.taxSetting.upsert({
      where: { id: 'default' },
      update: {
        ppnPercent: dto.ppnPercent,
        status: dto.status || 'ACTIVE',
        updatedBy: adminName,
      },
      create: {
        id: 'default',
        ppnPercent: dto.ppnPercent,
        status: dto.status || 'ACTIVE',
        createdBy: adminName,
        updatedBy: adminName,
      },
    });
  }
}
