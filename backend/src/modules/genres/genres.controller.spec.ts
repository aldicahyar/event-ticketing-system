import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';

describe('GenresController', () => {
  const service = {
    list: jest.fn(),
    listActive: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as GenresService;

  const controller = new GenresController(service);

  beforeEach(() => jest.clearAllMocks());

  const meta = (method: string, key: string) =>
    Reflect.getMetadata(
      key,
      GenresController.prototype[method as keyof GenresController] as unknown as object,
    );

  it.each([
    ['list', 'view'],
    ['create', 'create'],
    ['update', 'edit'],
    ['delete', 'delete'],
  ])('%s requires GENRES %s permission behind JwtAuthGuard + PermissionsGuard', (method, action) => {
    expect(meta(method, PERMISSION_KEY)).toEqual({ menu_code: 'GENRES', action });
    expect(meta(method, '__guards__')).toEqual([JwtAuthGuard, PermissionsGuard]);
  });

  it('getById only requires JwtAuthGuard (no permission gate)', () => {
    expect(meta('getById', '__guards__')).toEqual([JwtAuthGuard]);
    expect(meta('getById', PERMISSION_KEY)).toBeUndefined();
  });

  it('listActive is public (no guards)', () => {
    expect(meta('listActive', '__guards__')).toBeUndefined();
  });

  it('listActive returns active genres', async () => {
    (service.listActive as jest.Mock).mockResolvedValue([{ id: 'g1' }]);

    const result = await controller.listActive();

    expect(service.listActive).toHaveBeenCalled();
    expect(result.data).toEqual([{ id: 'g1' }]);
  });

  it('list passes query to the service', async () => {
    (service.list as jest.Mock).mockResolvedValue([]);
    const query = { search: 'roc', is_active: true };

    await controller.list(query);

    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('getById delegates to the service', async () => {
    (service.getById as jest.Mock).mockResolvedValue({ id: 'g1' });

    const result = await controller.getById('g1');

    expect(service.getById).toHaveBeenCalledWith('g1');
    expect(result.data).toEqual({ id: 'g1' });
  });

  it('create delegates to the service', async () => {
    (service.create as jest.Mock).mockResolvedValue({ id: 'g1' });
    const dto = { name: 'Rock' };

    const result = await controller.create(dto as never);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result.data).toEqual({ id: 'g1' });
  });

  it('update delegates to the service', async () => {
    (service.update as jest.Mock).mockResolvedValue({ id: 'g1' });

    await controller.update('g1', { name: 'Rock 2' } as never);

    expect(service.update).toHaveBeenCalledWith('g1', { name: 'Rock 2' });
  });

  it('delete delegates to the service', async () => {
    (service.delete as jest.Mock).mockResolvedValue({ id: 'g1', deleted: true });

    const result = await controller.delete('g1');

    expect(service.delete).toHaveBeenCalledWith('g1');
    expect(result.data).toEqual({ id: 'g1', deleted: true });
  });

  it('declares GET /genres/admin before GET /genres/:id so "admin" is not eaten by :id', () => {
    // ponytail: route-order regression check; upgrade to e2e if routing grows
    const path = (method: string) =>
      Reflect.getMetadata(
        PATH_METADATA,
        GenresController.prototype[method as keyof GenresController] as unknown as object,
      );
    expect(path('list')).toBe('admin');
    expect(path('getById')).toBe(':id');

    const methods = Object.getOwnPropertyNames(GenresController.prototype);
    expect(methods.indexOf('list')).toBeLessThan(methods.indexOf('getById'));
  });
});
