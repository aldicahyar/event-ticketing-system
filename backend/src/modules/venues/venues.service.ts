import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVenueDto) {
    return this.prisma.t_mtr_venues.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city.toUpperCase(),
        country: dto.country,
        capacity: dto.capacity,
        seat_map: dto.seat_map,
        description: dto.description,
        image_url: dto.image_url,
      },
    });
  }

  async findAll() {
    return this.prisma.t_mtr_venues.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.t_mtr_venues.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return venue;
  }

  async update(dto: UpdateVenueDto) {
    const { id, ...updates } = dto;
    // Check if venue exists
    await this.findOne(id);

    // Match create(): normalize city to uppercase so casing stays consistent
    // across create and edit.
    if (updates.city !== undefined) {
      updates.city = updates.city.toUpperCase();
    }

    return this.prisma.t_mtr_venues.update({
      where: { id },
      data: updates,
    });
  }

  async remove(id: string) {
    // Check if venue exists
    await this.findOne(id);

    await this.prisma.t_mtr_venues.delete({
      where: { id },
    });

    return { message: 'Venue deleted successfully' };
  }
}
