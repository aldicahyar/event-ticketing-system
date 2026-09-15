import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { GenresService } from './genres.service';

describe('GenresService', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const eventsCount = jest.fn();

  const prisma = {
    t_mtr_genres: { findMany, findUnique, create, update, delete: remove },
    t_trx_events: { count: eventsCount },
  } as unknown as PrismaService;

  const service = new GenresService(prisma);

  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns all genres ordered by name asc', async () => {
      findMany.mockResolvedValue([{ name: 'Jazz' }, { name: 'Rock' }]);

      const result = await service.list();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, orderBy: { name: 'asc' } }),
      );
      expect(result).toHaveLength(2);
    });

    it('filters by search and is_active', async () => {
      findMany.mockResolvedValue([]);

      await service.list({ search: 'roc', is_active: true });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'roc', mode: 'insensitive' } },
              { code: { contains: 'roc', mode: 'insensitive' } },
            ],
            is_active: true,
          },
        }),
      );
    });
  });

  describe('listActive', () => {
    it('returns only active genres ordered by name asc', async () => {
      findMany.mockResolvedValue([{ name: 'Rock', is_active: true }]);

      await service.listActive();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_active: true }, orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('getById', () => {
    it('returns the genre when found', async () => {
      findUnique.mockResolvedValue({ id: 'g1', name: 'Rock' });

      const result = await service.getById('g1');

      expect(findUnique).toHaveBeenCalledWith({ where: { id: 'g1' } });
      expect(result).toEqual({ id: 'g1', name: 'Rock' });
    });

    it('throws NotFoundException when not found', async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('auto-generates code from name in uppercase snake_case', async () => {
      findUnique.mockResolvedValue(null);
      create.mockResolvedValue({ id: 'g1', name: 'Hip Hop', code: 'HIP_HOP' });

      const result = await service.create({ name: 'Hip Hop' });

      expect(findUnique).toHaveBeenCalledWith({ where: { code: 'HIP_HOP' } });
      expect(create).toHaveBeenCalledWith({
        data: { name: 'Hip Hop', code: 'HIP_HOP', description: null, is_active: true },
      });
      expect(result.code).toBe('HIP_HOP');
    });

    it('rejects when a code cannot be generated from the name', async () => {
      await expect(service.create({ name: '###' })).rejects.toThrow(BadRequestException);
      expect(create).not.toHaveBeenCalled();
    });

    it('uses the provided code uppercased', async () => {
      findUnique.mockResolvedValue(null);
      create.mockResolvedValue({ code: 'METAL' });

      await service.create({ name: 'Metal', code: ' metal ' });

      expect(findUnique).toHaveBeenCalledWith({ where: { code: 'METAL' } });
    });

    it('throws ConflictException on duplicate code', async () => {
      findUnique.mockResolvedValue({ id: 'g1', code: 'ROCK' });

      await expect(service.create({ name: 'Rock' })).rejects.toThrow(ConflictException);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates fields when the genre exists', async () => {
      findUnique.mockResolvedValueOnce({ id: 'g1', code: 'ROCK' });
      update.mockResolvedValue({ id: 'g1', name: 'Rock Classic' });

      const result = await service.update('g1', { name: 'Rock Classic', is_active: false });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { name: 'Rock Classic', is_active: false },
      });
      expect(result.name).toBe('Rock Classic');
    });

    it('throws ConflictException when code changes to an existing one', async () => {
      findUnique.mockResolvedValueOnce({ id: 'g1', code: 'ROCK' }); // existing genre
      findUnique.mockResolvedValueOnce({ id: 'g2', code: 'JAZZ' }); // code clash

      await expect(service.update('g1', { code: 'jazz' })).rejects.toThrow(ConflictException);
      expect(update).not.toHaveBeenCalled();
    });

    it('skips uniqueness check when code is unchanged', async () => {
      findUnique.mockResolvedValueOnce({ id: 'g1', code: 'ROCK' });
      update.mockResolvedValue({ id: 'g1' });

      await service.update('g1', { code: 'ROCK' });

      expect(findUnique).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith({ where: { id: 'g1' }, data: {} });
    });

    it('throws NotFoundException when genre does not exist', async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('throws BadRequestException when genre is assigned to events', async () => {
      findUnique.mockResolvedValue({ id: 'g1' });
      eventsCount.mockResolvedValue(3);

      await expect(service.delete('g1')).rejects.toThrow(
        new BadRequestException(
          'Cannot delete genre that is currently assigned to events. Deactivate it instead.',
        ),
      );
      expect(remove).not.toHaveBeenCalled();
    });

    it('deletes the genre when not in use', async () => {
      findUnique.mockResolvedValue({ id: 'g1' });
      eventsCount.mockResolvedValue(0);
      remove.mockResolvedValue({ id: 'g1' });

      const result = await service.delete('g1');

      expect(eventsCount).toHaveBeenCalledWith({ where: { genre_id: 'g1' } });
      expect(result).toEqual({ id: 'g1', deleted: true });
    });

    it('throws NotFoundException when genre does not exist', async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
