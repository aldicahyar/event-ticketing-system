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
    const tierCount = await this.prisma.t_mtr_ticket_tier_settings.count();
    if (tierCount === 0) {
      await this.prisma.t_mtr_ticket_tier_settings.createMany({
        data: [
          {
            id: SeatType.VIP,
            ratio: 0.2,
            multiplier: 2,
            status: 'ACTIVE',
            created_by: 'system',
            updated_by: 'system',
          },
          {
            id: SeatType.PREMIUM,
            ratio: 0.5,
            multiplier: 1.5,
            status: 'ACTIVE',
            created_by: 'system',
            updated_by: 'system',
          },
          {
            id: SeatType.REGULAR,
            ratio: 1,
            multiplier: 1,
            status: 'ACTIVE',
            created_by: 'system',
            updated_by: 'system',
          },
        ],
      });
      console.log('Seeded default TicketTierSettings');
    }

    // 2. Seed TaxSettings
    const taxCount = await this.prisma.t_mtr_tax_settings.count();
    if (taxCount === 0) {
      await this.prisma.t_mtr_tax_settings.create({
        data: {
          id: 'default',
          ppn_percent: 11,
          status: 'ACTIVE',
          created_by: 'system',
          updated_by: 'system',
        },
      });
      console.log('Seeded default TaxSetting');
    }
  }

  async getSettings() {
    const [tiers, tax] = await Promise.all([
      this.prisma.t_mtr_ticket_tier_settings.findMany({
        orderBy: { ratio: 'asc' },
      }),
      this.prisma.t_mtr_tax_settings.findUnique({
        where: { id: 'default' },
      }),
    ]);

    return {
      tiers,
      tax: tax || {
        id: 'default',
        ppn_percent: 11,
        status: 'ACTIVE',
        created_by: 'system',
        updated_by: 'system',
      },
    };
  }

  async getActiveTiers() {
    return this.prisma.t_mtr_ticket_tier_settings.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { ratio: 'asc' },
    });
  }

  async getActiveTax() {
    const tax = await this.prisma.t_mtr_tax_settings.findFirst({
      where: { id: 'default', status: 'ACTIVE' },
    });
    return tax || { ppn_percent: 0 }; // If inactive, default to 0% PPN
  }

  async updateTierSetting(dto: UpdateTierSettingDto, adminName: string) {
    return this.prisma.t_mtr_ticket_tier_settings.upsert({
      where: { id: dto.id },
      update: {
        ratio: dto.ratio,
        multiplier: dto.multiplier,
        status: dto.status || 'ACTIVE',
        updated_by: adminName,
      },
      create: {
        id: dto.id,
        ratio: dto.ratio,
        multiplier: dto.multiplier,
        status: dto.status || 'ACTIVE',
        created_by: adminName,
        updated_by: adminName,
      },
    });
  }

  async updateTaxSetting(dto: UpdateTaxSettingDto, adminName: string) {
    return this.prisma.t_mtr_tax_settings.upsert({
      where: { id: 'default' },
      update: {
        ppn_percent: dto.ppn_percent,
        status: dto.status || 'ACTIVE',
        updated_by: adminName,
      },
      create: {
        id: 'default',
        ppn_percent: dto.ppn_percent,
        status: dto.status || 'ACTIVE',
        created_by: adminName,
        updated_by: adminName,
      },
    });
  }
}
