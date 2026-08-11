import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, t_mtr_venues } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SettingsService } from '../settings/settings.service';
import { DEFAULT_CURRENCY } from '../../common/constants/currency.constants';

// Issue 3 fix: typed interface instead of 'any' for seat_map
interface SeatMap {
  rows?: number;
  seatsPerRow?: number;
  layout?: string;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async create(dto: CreateEventDto, organizer_id: string) {
    // Issue 1 fix: validate start_date_time must be before end_date_time
    const start = new Date(dto.start_date_time);
    const end = new Date(dto.end_date_time);
    if (start >= end) {
      throw new BadRequestException('start_date_time must be before end_date_time');
    }

    if (dto.ticket_tiers?.length) {
      for (const tier of dto.ticket_tiers) {
        if (new Date(tier.start_date_time) >= new Date(tier.end_date_time)) {
          throw new BadRequestException(
            `Tier ${tier.name} start_date_time must be before end_date_time`,
          );
        }
      }
    }

    // 1. Verify venue exists
    const venue = await this.prisma.t_mtr_venues.findUnique({
      where: { id: dto.venue_id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${dto.venue_id} not found`);
    }

    // Use transaction if ticket tiers are provided
    if (dto.ticket_tiers && dto.ticket_tiers.length > 0) {
      return this.prisma.$transaction(async (tx) => {
        const event = await tx.t_trx_events.create({
          data: {
            title: dto.title,
            subtitle: dto.subtitle,
            description: dto.description,
            venue_id: dto.venue_id,
            event_date: new Date(dto.event_date),
            start_date_time: start,
            end_date_time: end,
            status: dto.status || 'DRAFT',
            base_price: dto.base_price,
            currency: dto.currency || DEFAULT_CURRENCY,
            organizer_id: organizer_id,
            image_url: dto.image_url,
          },
        });

        for (const tier of dto.ticket_tiers!) {
          const createdTier = await tx.t_trx_event_ticket_tiers.create({
            data: {
              event_id: event.id,
              name: tier.name,
              price: tier.price,
              stock: tier.stock,
              description: tier.description,
              start_date_time: new Date(tier.start_date_time),
              end_date_time: new Date(tier.end_date_time),
            },
          });

          // Generate dummy seats for this tier based on stock
          const seatsToCreate = [];
          for (let i = 1; i <= tier.stock; i++) {
            seatsToCreate.push({
              event_id: event.id,
              venue_id: dto.venue_id,
              row: tier.name, // Use tier name as row indicator
              number: i,
              type: 'REGULAR',
              status: 'AVAILABLE',
              price: tier.price,
              tier_id: createdTier.id,
            });
          }
          if (seatsToCreate.length > 0) {
            await tx.t_mtr_seats.createMany({ data: seatsToCreate });
          }
        }

        return tx.t_trx_events.findUnique({
          where: { id: event.id },
          include: { venue: true, seats: true, ticket_tiers: true },
        });
      });
    }

    // 2. Create the event
    const event = await this.prisma.t_trx_events.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        venue_id: dto.venue_id,
        event_date: new Date(dto.event_date),
        start_date_time: start,
        end_date_time: end,
        status: dto.status || 'DRAFT',
        base_price: dto.base_price,
        currency: dto.currency || DEFAULT_CURRENCY,
        organizer_id: organizer_id,
        image_url: dto.image_url,
      },
    });

    // 3. Generate seats automatically based on t_mtr_venues seat_map configuration
    await this.generateSeatsForEvent(event.id, venue, dto.base_price);

    return this.findOne(event.id);
  }

  async findAll() {
    // Returns events with a computed available_seats count.
    const events = await this.prisma.t_trx_events.findMany({
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
        ticket_tiers: true,
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

    return events.map(({ _count, bookings, ...event }) => ({
      ...event,
      available_seats: _count?.seats ?? 0,
      tickets_sold: bookings.reduce((total, booking) => total + booking._count.tickets, 0),
    }));
  }

  async findOne(id: string) {
    const event = await this.prisma.t_trx_events.findUnique({
      where: { id },
      include: {
        venue: true,
        ticket_tiers: true,
        seats: {
          orderBy: [{ row: 'asc' }, { number: 'asc' }],
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(dto: UpdateEventDto) {
    const { id, ...updates } = dto;

    // Check if event exists and get current data for validation
    const existing = await this.findOne(id);

    // If venue_id is provided and different, verify new venue exists
    let venue: t_mtr_venues | null = null;
    if (updates.venue_id && updates.venue_id !== existing.venue_id) {
      venue = await this.prisma.t_mtr_venues.findUnique({
        where: { id: updates.venue_id },
      });
      if (!venue) {
        throw new NotFoundException(`Venue with ID ${updates.venue_id} not found`);
      }
    }

    // Build update data with Date conversions using Prisma's native EventUpdateInput type
    const updateData: Prisma.t_trx_eventsUpdateInput = {
      title: updates.title,
      subtitle: updates.subtitle,
      description: updates.description,
      venue: updates.venue_id ? { connect: { id: updates.venue_id } } : undefined,
      event_date: updates.event_date ? new Date(updates.event_date) : undefined,
      start_date_time: updates.start_date_time ? new Date(updates.start_date_time) : undefined,
      end_date_time: updates.end_date_time ? new Date(updates.end_date_time) : undefined,
      status: updates.status,
      base_price: updates.base_price,
      currency: updates.currency,
      image_url: updates.image_url,
    };

    // Issue 2 fix: validate updated start < end using updated or existing values
      const finalStart = (updateData.start_date_time as Date | undefined) ?? existing.start_date_time;
      const finalEnd = (updateData.end_date_time as Date | undefined) ?? existing.end_date_time;
      if (finalStart >= finalEnd) {
        throw new BadRequestException('start_date_time must be before end_date_time');
      }
  
      if (dto.ticket_tiers?.length) {
        for (const tier of dto.ticket_tiers) {
          if (new Date(tier.start_date_time) >= new Date(tier.end_date_time)) {
            throw new BadRequestException(
              `Tier ${tier.name} start_date_time must be before end_date_time`,
            );
          }
        }
      }

      // Use transaction if ticket tiers are provided
      if (dto.ticket_tiers && dto.ticket_tiers.length > 0) {
        // Prevent updates if any seats are already reserved or sold
        const nonAvailableSeatsCount = await this.prisma.t_mtr_seats.count({
          where: { event_id: id, status: { in: ['RESERVED', 'SOLD'] } },
        });

        if (nonAvailableSeatsCount > 0) {
           throw new BadRequestException(
             'Cannot modify event tickets/tiers. Some tickets are already reserved or sold.',
           );
        }

        return this.prisma.$transaction(async (tx) => {
           const updatedEvent = await tx.t_trx_events.update({
            where: { id },
            data: updateData,
          });

           // Simple strategy: we drop old tiers/seats if no bookings (checked above), and recreate.
           await tx.t_mtr_seats.deleteMany({
             where: { event_id: id },
           });

           await tx.t_trx_event_ticket_tiers.deleteMany({
             where: { event_id: id },
           });
           
           for (const tier of dto.ticket_tiers!) {
            const createdTier = await tx.t_trx_event_ticket_tiers.create({
              data: {
                event_id: id,
                name: tier.name,
                price: tier.price,
                stock: tier.stock,
                description: tier.description,
                start_date_time: new Date(tier.start_date_time),
                end_date_time: new Date(tier.end_date_time),
              },
            });
  
            // Generate dummy seats for this tier based on stock
            const seatsToCreate = [];
            for (let i = 1; i <= tier.stock; i++) {
              seatsToCreate.push({
                event_id: id,
                venue_id: updatedEvent.venue_id,
                row: tier.name, // Use tier name as row indicator
                number: i,
                type: 'REGULAR',
                status: 'AVAILABLE',
                price: tier.price,
                tier_id: createdTier.id,
              });
            }
            if (seatsToCreate.length > 0) {
              await tx.t_mtr_seats.createMany({ data: seatsToCreate });
            }
          }

          return tx.t_trx_events.findUnique({
            where: { id },
            include: { venue: true, seats: true, ticket_tiers: true },
          });

        });
      }
  
      const updatedEvent = await this.prisma.t_trx_events.update({
        where: { id },
        data: updateData,
      });

    // If venue was changed, regenerate seats from scratch (new seat map).
    if (venue) {
      // 1. Delete existing seats
      await this.prisma.t_mtr_seats.deleteMany({
        where: { event_id: id },
      });

      // 2. Generate new seats using the new venue's seat_map configuration
      const finalBasePrice = updates.base_price ?? existing.base_price;
      await this.generateSeatsForEvent(id, venue, finalBasePrice);
    } else if (
      updates.base_price !== undefined &&
      Number(updates.base_price) !== Number(existing.base_price)
    ) {
      // Base price changed but the venue (and thus the seat map) did not.
      // Reprice existing seats in place rather than regenerating them —
      // regeneration deletes SOLD/RESERVED seats and would break their bookings.
      await this.repriceAvailableSeats(id, updates.base_price);
    }

    return updatedEvent;
  }

  /**
   * Recompute prices for an event's still-AVAILABLE seats after a base-price
   * change, preserving each seat's tier via its stored `type` and the tier
   * multiplier from settings. SOLD/RESERVED seats keep the price the buyer
   * already agreed to.
   */
  private async repriceAvailableSeats(event_id: string, base_price: any) {
    const tiers = await this.settingsService.getActiveTiers();
    const multiplierByType = new Map<string, number>();
    for (const tier of tiers) {
      multiplierByType.set(tier.id, tier.multiplier);
    }

    const base = Number(base_price);
    const types = ['VIP', 'PREMIUM', 'REGULAR'] as const;
    // One updateMany per distinct seat type — a handful of queries regardless
    // of seat count.
    await this.prisma.$transaction(
      types.map((type) =>
        this.prisma.t_mtr_seats.updateMany({
          where: { event_id, type, status: 'AVAILABLE' },
          data: { price: base * (multiplierByType.get(type) ?? 1) },
        }),
      ),
    );
  }

  async remove(id: string) {
    // Check if event exists
    await this.findOne(id);

    // Delete event (associated seats will be deleted due to Cascade onDelete in schema)
    await this.prisma.t_trx_events.delete({
      where: { id },
    });

    return { message: 'Event and all its seats deleted successfully' };
  }

  private async generateSeatsForEvent(event_id: string, venue: any, base_price: any) {
    const seatMapObj = venue.seat_map as SeatMap;
    const rowsCount = seatMapObj?.rows ? Number(seatMapObj.rows) : 5;
    const seatsPerRow = seatMapObj?.seatsPerRow ? Number(seatMapObj.seatsPerRow) : 20;

    // Fetch active tiers from settings table, sorted by ratio ascending (e.g. VIP 0.2, PREMIUM 0.5, REGULAR 1.0)
    const tiers = await this.settingsService.getActiveTiers();

    const seatsToCreate = [];
    for (let r = 0; r < rowsCount; r++) {
      const rowName = String.fromCodePoint(65 + r); // A, B, C, D, ...

      let type: 'VIP' | 'PREMIUM' | 'REGULAR' = 'REGULAR';
      let multiplier = 1;

      const positionRatio = r / rowsCount;
      const matchedTier = tiers.find((t) => positionRatio < t.ratio);
      if (matchedTier) {
        type = matchedTier.id as 'VIP' | 'PREMIUM' | 'REGULAR';
        multiplier = matchedTier.multiplier;
      }

      const price = base_price * multiplier;

      for (let s = 1; s <= seatsPerRow; s++) {
        seatsToCreate.push({
          event_id,
          venue_id: venue.id,
          row: rowName,
          number: s,
          type: type,
          status: 'AVAILABLE',
          price: price,
        });
      }
    }

    if (seatsToCreate.length > 0) {
      await this.prisma.t_mtr_seats.createMany({
        data: seatsToCreate,
      });
    }
  }
}
