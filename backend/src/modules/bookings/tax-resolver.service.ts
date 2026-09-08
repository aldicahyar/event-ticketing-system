import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

export interface ResolvedTax {
  rate: number;
  region: string;
}

@Injectable()
export class TaxResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the applicable tax rate using a hierarchical fallback strategy:
   * 1. Exact match: country + city (e.g. ID + BALI)
   * 2. Country fallback: country + 'GLOBAL' (e.g. ID + GLOBAL)
   * 3. Global fallback: id = 'default' (Legacy compatibility)
   * 4. Zero fallback: 0% rate if no rules match or active.
   */
  async resolveTaxForVenue(country?: string | null, city?: string | null): Promise<ResolvedTax> {
    const cty = country?.toUpperCase()?.trim();
    const ctyRegion = city?.toUpperCase()?.trim();

    if (cty && ctyRegion) {
      // 1. Try exact match (City/Region)
      const exactMatch = await this.prisma.t_mtr_tax_settings.findFirst({
        where: { country: cty, region: ctyRegion, status: 'ACTIVE' },
      });
      if (exactMatch) {
        return {
          rate: exactMatch.ppn_percent,
          region: `${cty}-${ctyRegion}`,
        };
      }
    }

    if (cty) {
      // 2. Try Country fallback ('GLOBAL')
      const countryMatch = await this.prisma.t_mtr_tax_settings.findFirst({
        where: { country: cty, region: 'GLOBAL', status: 'ACTIVE' },
      });
      if (countryMatch) {
        return {
          rate: countryMatch.ppn_percent,
          region: `${cty}`,
        };
      }
    }

    // 3. Try global default ('default')
    const defaultMatch = await this.prisma.t_mtr_tax_settings.findUnique({
      where: { id: 'default' },
    });
    if (defaultMatch?.status === 'ACTIVE') {
      return {
        rate: defaultMatch.ppn_percent,
        region: 'DEFAULT',
      };
    }

    // 4. Ultimate fallback: no active taxes
    return {
      rate: 0,
      region: 'NONE',
    };
  }
}
