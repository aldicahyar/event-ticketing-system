import { PrismaService } from '../../common/database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { EventsService } from './events.service';

describe('EventsService - findAll', () => {
  const findMany = jest.fn();
  const prisma = {
    t_trx_events: { findMany },
  } as unknown as PrismaService;
  const settingsService = {} as SettingsService;
  const service = new EventsService(prisma, settingsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps available seats and sums active ticket counts from valid bookings', async () => {
    findMany.mockResolvedValue([
      {
        id: 'event-1',
        title: 'Concert',
        _count: { seats: 12 },
        bookings: [{ _count: { tickets: 2 } }, { _count: { tickets: 3 } }],
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 'event-1',
        title: 'Concert',
        available_seats: 12,
        tickets_sold: 5,
      },
    ]);
  });

  it('returns zero tickets sold when no valid booking has tickets', async () => {
    findMany.mockResolvedValue([
      {
        id: 'event-2',
        title: 'Empty Event',
        _count: { seats: 20 },
        bookings: [],
      },
    ]);

    const [event] = await service.findAll();

    expect(event.tickets_sold).toBe(0);
    expect(event.available_seats).toBe(20);
  });

  it('counts only active tickets from confirmed bookings with completed payment', async () => {
    findMany.mockResolvedValue([]);

    await service.findAll();

    expect(findMany).toHaveBeenCalledWith({
      include: {
        venue: {
          select: {
            name: true,
            city: true,
            address: true,
            capacity: true,
          },
        },
        bookings: {
          where: {
            status: 'CONFIRMED',
            payment: { status: 'COMPLETED' },
          },
          select: {
            _count: {
              select: {
                tickets: {
                  where: { revoked_at: null },
                },
              },
            },
          },
        },
        _count: {
          select: {
            seats: {
              where: { status: 'AVAILABLE' },
            },
          },
        },
      },
      orderBy: { start_date_time: 'asc' },
    });
  });
});
