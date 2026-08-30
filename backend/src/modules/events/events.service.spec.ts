import { PrismaService } from '../../common/database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { EventsService } from './events.service';

describe('EventsService', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const create = jest.fn();
  const createMany = jest.fn();
  const update = jest.fn();
  const deleteMany = jest.fn();
  const count = jest.fn();

  const prisma = {
    t_trx_events: { findMany, findUnique, create, update },
    t_mtr_venues: { findUnique },
    t_trx_event_ticket_tiers: { create, deleteMany },
    t_mtr_seats: { createMany, deleteMany, count },
    $transaction: jest.fn((callback) => callback(prisma)),
  } as unknown as PrismaService;

  const settingsService = {} as SettingsService;
  const service = new EventsService(prisma, settingsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
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
  });

  describe('create with ticket_tiers', () => {
    it('creates event with ticket tiers and generates dummy seats in a transaction', async () => {
      const dto = {
        title: 'Tiered Event',
        description: 'Description long enough',
        venue_id: 'venue-1',
        event_date: '2026-08-15T19:00:00.000Z',
        start_date_time: '2026-07-15T10:00:00.000Z',
        end_date_time: '2026-08-15T22:00:00.000Z',
        base_price: 100000,
        ticket_tiers: [
          {
            name: 'VIP',
            price: 500000,
            stock: 2,
            start_date_time: '2026-07-15T10:00:00.000Z',
            end_date_time: '2026-08-15T22:00:00.000Z',
          },
        ],
      };

      (prisma.t_mtr_venues.findUnique as jest.Mock).mockResolvedValue({ id: 'venue-1' });
      (prisma.t_trx_events.create as jest.Mock).mockResolvedValueOnce({ id: 'event-1' });
      (prisma.t_trx_event_ticket_tiers.create as jest.Mock).mockResolvedValueOnce({ id: 'tier-1' });
      (prisma.t_trx_events.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        title: 'Tiered Event',
        ticket_tiers: [{ id: 'tier-1', name: 'VIP' }],
        seats: [{}, {}],
      });

      const result = await service.create(dto as any, 'organizer-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.t_trx_event_ticket_tiers.create).toHaveBeenCalledWith({
        data: {
          event_id: 'event-1',
          name: 'VIP',
          price: 500000,
          stock: 2,
          description: undefined,
          features: [],
          is_seated: true,
          start_date_time: new Date('2026-07-15T10:00:00.000Z'),
          end_date_time: new Date('2026-08-15T22:00:00.000Z'),
        },
      });
      expect(prisma.t_mtr_seats.createMany).toHaveBeenCalledWith({
        data: [
          {
            event_id: 'event-1',
            venue_id: 'venue-1',
            row: 'VIP',
            number: 1,
            type: 'REGULAR',
            status: 'AVAILABLE',
            price: 500000,
            tier_id: 'tier-1',
          },
          {
            event_id: 'event-1',
            venue_id: 'venue-1',
            row: 'VIP',
            number: 2,
            type: 'REGULAR',
            status: 'AVAILABLE',
            price: 500000,
            tier_id: 'tier-1',
          },
        ],
      });
      expect(result).toHaveProperty('id', 'event-1');
    });
  });

  describe('update with ticket_tiers', () => {
    it('updates event and replaces ticket tiers and dummy seats when no tickets are reserved/sold', async () => {
      const updateDto = {
        id: 'event-1',
        title: 'Updated Event',
        ticket_tiers: [
          {
            name: 'VVIP',
            price: 1000000,
            stock: 1,
            start_date_time: '2026-07-15T10:00:00.000Z',
            end_date_time: '2026-08-15T22:00:00.000Z',
          },
        ],
      };

      (prisma.t_trx_events.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'event-1',
          venue_id: 'venue-1',
          start_date_time: new Date('2026-07-15T10:00:00.000Z'),
          end_date_time: new Date('2026-08-15T22:00:00.000Z'),
        })
        .mockResolvedValueOnce({
          id: 'event-1',
          title: 'Updated Event',
          ticket_tiers: [{ id: 'tier-2', name: 'VVIP' }],
          seats: [{}],
        });

      (prisma.t_mtr_seats.count as jest.Mock).mockResolvedValue(0);
      (prisma.t_trx_events.update as jest.Mock).mockResolvedValue({
        id: 'event-1',
        venue_id: 'venue-1',
      });
      (prisma.t_trx_event_ticket_tiers.create as jest.Mock).mockResolvedValue({ id: 'tier-2' });

      const result = await service.update(updateDto as any);

      expect(prisma.t_mtr_seats.count).toHaveBeenCalledWith({
        where: { event_id: 'event-1', status: { in: ['RESERVED', 'SOLD'] } },
      });
      expect(prisma.t_mtr_seats.deleteMany).toHaveBeenCalledWith({
        where: { event_id: 'event-1' },
      });
      expect(prisma.t_trx_event_ticket_tiers.deleteMany).toHaveBeenCalledWith({
        where: { event_id: 'event-1' },
      });
      expect(prisma.t_trx_event_ticket_tiers.create).toHaveBeenCalledWith({
        data: {
          event_id: 'event-1',
          name: 'VVIP',
          price: 1000000,
          stock: 1,
          description: undefined,
          features: [],
          is_seated: true,
          start_date_time: new Date('2026-07-15T10:00:00.000Z'),
          end_date_time: new Date('2026-08-15T22:00:00.000Z'),
        },
      });
      expect(result).toHaveProperty('id', 'event-1');
    });

    it('throws BadRequestException if updating ticket_tiers when seats are already RESERVED or SOLD', async () => {
      const updateDto = {
        id: 'event-1',
        ticket_tiers: [
          {
            name: 'VVIP',
            price: 1000000,
            stock: 1,
            start_date_time: '2026-07-15T10:00:00.000Z',
            end_date_time: '2026-08-15T22:00:00.000Z',
          },
        ],
      };

      (prisma.t_trx_events.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        venue_id: 'venue-1',
        start_date_time: new Date('2026-07-15T10:00:00.000Z'),
        end_date_time: new Date('2026-08-15T22:00:00.000Z'),
      });

      (prisma.t_mtr_seats.count as jest.Mock).mockResolvedValue(1);

      await expect(service.update(updateDto as any)).rejects.toThrow(
        'Cannot modify event tickets/tiers. Some tickets are already reserved or sold.',
      );
    });
  });
});
