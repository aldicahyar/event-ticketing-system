import { TaxResolverService } from './tax-resolver.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('TaxResolverService (GAP-15)', () => {
  let service: TaxResolverService;
  let prisma: {
    t_mtr_tax_settings: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      t_mtr_tax_settings: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new TaxResolverService(prisma as unknown as PrismaService);
  });

  it('resolves exact match for country and city (e.g. ID + BALI -> PB1 10%)', async () => {
    prisma.t_mtr_tax_settings.findFirst.mockResolvedValueOnce({
      id: 'tax_bali',
      country: 'ID',
      region: 'BALI',
      ppn_percent: 10,
      status: 'ACTIVE',
    });

    const result = await service.resolveTaxForVenue('id', 'bali');
    expect(result).toEqual({ rate: 10, region: 'ID-BALI' });
    expect(prisma.t_mtr_tax_settings.findFirst).toHaveBeenCalledWith({
      where: { country: 'ID', region: 'BALI', status: 'ACTIVE' },
    });
  });

  it('falls back to country GLOBAL match when city has no specific rule', async () => {
    // 1. City query fails
    prisma.t_mtr_tax_settings.findFirst.mockResolvedValueOnce(null);
    // 2. Country fallback succeeds
    prisma.t_mtr_tax_settings.findFirst.mockResolvedValueOnce({
      id: 'tax_id_global',
      country: 'ID',
      region: 'GLOBAL',
      ppn_percent: 11,
      status: 'ACTIVE',
    });

    const result = await service.resolveTaxForVenue('ID', 'Surabaya');
    expect(result).toEqual({ rate: 11, region: 'ID' });
  });

  it('falls back to global row id=default when no country-specific rule exists', async () => {
    prisma.t_mtr_tax_settings.findFirst.mockResolvedValue(null);
    prisma.t_mtr_tax_settings.findUnique.mockResolvedValueOnce({
      id: 'default',
      ppn_percent: 11,
      status: 'ACTIVE',
    });

    const result = await service.resolveTaxForVenue(undefined, undefined);
    expect(result).toEqual({ rate: 11, region: 'DEFAULT' });
    expect(prisma.t_mtr_tax_settings.findUnique).toHaveBeenCalledWith({
      where: { id: 'default' },
    });
  });

  it('returns rate=0 and region=NONE when no active tax settings exist', async () => {
    prisma.t_mtr_tax_settings.findFirst.mockResolvedValue(null);
    prisma.t_mtr_tax_settings.findUnique.mockResolvedValue(null);

    const result = await service.resolveTaxForVenue('SG', 'Singapore');
    expect(result).toEqual({ rate: 0, region: 'NONE' });
  });

  it('ignores INACTIVE default row and returns rate=0', async () => {
    prisma.t_mtr_tax_settings.findFirst.mockResolvedValue(null);
    prisma.t_mtr_tax_settings.findUnique.mockResolvedValueOnce({
      id: 'default',
      ppn_percent: 11,
      status: 'INACTIVE',
    });

    const result = await service.resolveTaxForVenue(null, null);
    expect(result).toEqual({ rate: 0, region: 'NONE' });
  });
});
