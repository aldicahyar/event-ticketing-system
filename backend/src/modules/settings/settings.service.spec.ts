import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { SettingsService } from './settings.service';

describe('SettingsService — Perks', () => {
  const perksFindMany = jest.fn();
  const perksFindUnique = jest.fn();
  const perksCreate = jest.fn();
  const perksUpdate = jest.fn();

  const prisma = {
    t_mtr_perks: { findMany: perksFindMany, findUnique: perksFindUnique, create: perksCreate, update: perksUpdate },
  } as unknown as PrismaService;

  const service = new SettingsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActivePerksGrouped', () => {
    it('groups active perks and facilities by type', async () => {
      perksFindMany.mockResolvedValue([
        { label: 'Fast Track Entry', type: 'PERK' },
        { label: 'Parking Area', type: 'FACILITY' },
      ]);

      const result = await service.getActivePerksGrouped();

      expect(perksFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'ACTIVE' } }),
      );
      expect(result).toEqual({
        PERK: ['Fast Track Entry'],
        FACILITY: ['Parking Area'],
      });
    });
  });

  describe('getAllPerks', () => {
    it('returns all perks ordered by type then label', async () => {
      perksFindMany.mockResolvedValue([{ label: 'Meet & Greet', type: 'PERK' }]);

      const result = await service.getAllPerks();

      expect(result).toHaveLength(1);
      expect(perksFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ type: 'asc' }, { label: 'asc' }] }),
      );
    });
  });

  describe('createPerk', () => {
    it('creates a perk with default ACTIVE status', async () => {
      perksFindUnique.mockResolvedValue(null);
      perksCreate.mockResolvedValue({ id: 'perk-1', label: 'Free Drinks', type: 'PERK' });

      await service.createPerk({ label: 'Free Drinks', type: 'PERK' } as any);

      expect(perksCreate).toHaveBeenCalledWith({
        data: { label: 'Free Drinks', type: 'PERK', status: 'ACTIVE' },
      });
    });

    it('throws ConflictException when label already exists', async () => {
      perksFindUnique.mockResolvedValue({ id: 'perk-1', label: 'Free Drinks' });

      await expect(
        service.createPerk({ label: 'Free Drinks', type: 'PERK' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updatePerk', () => {
    it('updates an existing perk', async () => {
      perksFindUnique
        .mockResolvedValueOnce({ id: 'perk-1', label: 'Free Drinks' })
        .mockResolvedValueOnce(null);
      perksUpdate.mockResolvedValue({ id: 'perk-1', label: 'Free Drinks+' });

      await service.updatePerk('perk-1', { label: 'Free Drinks+' } as any);

      expect(perksUpdate).toHaveBeenCalledWith({
        where: { id: 'perk-1' },
        data: { label: 'Free Drinks+', type: undefined, status: undefined },
      });
    });

    it('throws NotFoundException when perk does not exist', async () => {
      perksFindUnique.mockResolvedValue(null);

      await expect(service.updatePerk('missing', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when renaming to an existing label', async () => {
      perksFindUnique
        .mockResolvedValueOnce({ id: 'perk-1', label: 'Free Drinks' })
        .mockResolvedValueOnce({ id: 'perk-2', label: 'Parking Area' });

      await expect(
        service.updatePerk('perk-1', { label: 'Parking Area' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });
});
