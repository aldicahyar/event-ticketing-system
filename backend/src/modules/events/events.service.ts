import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, Venue } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SettingsService } from '../settings/settings.service';

// Issue 3 fix: typed interface instead of 'any' for seatMap
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

  async create(dto: CreateEventDto, organizerId: string) {
    // Issue 1 fix: validate startDateTime must be before endDateTime
    const start = new Date(dto.startDateTime);
    const end = new Date(dto.endDateTime);
    if (start >= end) {
      throw new BadRequestException('startDateTime must be before endDateTime');
    }

    // 1. Verify venue exists
    const venue = await this.prisma.venue.findUnique({
      where: { id: dto.venueId },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${dto.venueId} not found`);
    }

    // 2. Create the event
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        venueId: dto.venueId,
        startDateTime: start,
        endDateTime: end,
        status: dto.status || 'DRAFT',
        basePrice: dto.basePrice,
        currency: dto.currency || 'IDR',
        organizerId: organizerId,
        imageUrl: dto.imageUrl,
      },
    });

    // 3. Generate seats automatically based on Venue seatMap configuration
    await this.generateSeatsForEvent(event.id, venue, dto.basePrice);

    return this.findOne(event.id);
  }

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        venue: {
          select: {
            name: true,
            city: true,
            address: true,
            capacity: true,
          },
        },
      },
      orderBy: { startDateTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
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

    // If venueId is provided and different, verify new venue exists
    let venue: Venue | null = null;
    if (updates.venueId && updates.venueId !== existing.venueId) {
      venue = await this.prisma.venue.findUnique({
        where: { id: updates.venueId },
      });
      if (!venue) {
        throw new NotFoundException(`Venue with ID ${updates.venueId} not found`);
      }
    }

    // Build update data with Date conversions using Prisma's native EventUpdateInput type
    const updateData: Prisma.EventUpdateInput = {
      title: updates.title,
      subtitle: updates.subtitle,
      description: updates.description,
      venue: updates.venueId ? { connect: { id: updates.venueId } } : undefined,
      startDateTime: updates.startDateTime ? new Date(updates.startDateTime) : undefined,
      endDateTime: updates.endDateTime ? new Date(updates.endDateTime) : undefined,
      status: updates.status,
      basePrice: updates.basePrice,
      currency: updates.currency,
      imageUrl: updates.imageUrl,
    };

    // Issue 2 fix: validate updated start < end using updated or existing values
    const finalStart = (updateData.startDateTime as Date | undefined) ?? existing.startDateTime;
    const finalEnd = (updateData.endDateTime as Date | undefined) ?? existing.endDateTime;
    if (finalStart >= finalEnd) {
      throw new BadRequestException('startDateTime must be before endDateTime');
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: updateData,
    });

    // If venue was changed, regenerate seats from scratch (new seat map).
    if (venue) {
      // 1. Delete existing seats
      await this.prisma.seat.deleteMany({
        where: { eventId: id },
      });

      // 2. Generate new seats using the new venue's seatMap configuration
      const finalBasePrice = updates.basePrice ?? existing.basePrice;
      await this.generateSeatsForEvent(id, venue, finalBasePrice);
    } else if (
      updates.basePrice !== undefined &&
      Number(updates.basePrice) !== Number(existing.basePrice)
    ) {
      // Base price changed but the venue (and thus the seat map) did not.
      // Reprice existing seats in place rather than regenerating them —
      // regeneration deletes SOLD/RESERVED seats and would break their bookings.
      await this.repriceAvailableSeats(id, updates.basePrice);
    }

    return updatedEvent;
  }

  /**
   * Recompute prices for an event's still-AVAILABLE seats after a base-price
   * change, preserving each seat's tier via its stored `type` and the tier
   * multiplier from settings. SOLD/RESERVED seats keep the price the buyer
   * already agreed to.
   */
  private async repriceAvailableSeats(eventId: string, basePrice: any) {
    const tiers = await this.settingsService.getActiveTiers();
    const multiplierByType = new Map<string, number>();
    for (const tier of tiers) {
      multiplierByType.set(tier.id, tier.multiplier);
    }

    const base = Number(basePrice);
    const types = ['VIP', 'PREMIUM', 'REGULAR'] as const;
    // One updateMany per distinct seat type — a handful of queries regardless
    // of seat count.
    await this.prisma.$transaction(
      types.map((type) =>
        this.prisma.seat.updateMany({
          where: { eventId, type, status: 'AVAILABLE' },
          data: { price: base * (multiplierByType.get(type) ?? 1) },
        }),
      ),
    );
  }

  async remove(id: string) {
    // Check if event exists
    await this.findOne(id);

    // Delete event (associated seats will be deleted due to Cascade onDelete in schema)
    await this.prisma.event.delete({
      where: { id },
    });

    return { message: 'Event and all its seats deleted successfully' };
  }

  private async generateSeatsForEvent(eventId: string, venue: any, basePrice: any) {
    const seatMapObj = venue.seatMap as SeatMap;
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
      const matchedTier = tiers.find(t => positionRatio < t.ratio);
      if (matchedTier) {
        type = matchedTier.id as 'VIP' | 'PREMIUM' | 'REGULAR';
        multiplier = matchedTier.multiplier;
      }

      const price = basePrice * multiplier;

      for (let s = 1; s <= seatsPerRow; s++) {
        seatsToCreate.push({
          eventId,
          venueId: venue.id,
          row: rowName,
          number: s,
          type: type,
          status: 'AVAILABLE',
          price: price,
        });
      }
    }

    if (seatsToCreate.length > 0) {
      await this.prisma.seat.createMany({
        data: seatsToCreate,
      });
    }
  }
}
