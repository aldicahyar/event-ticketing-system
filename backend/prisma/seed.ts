import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  const venue = await prisma.venue.create({
    data: {
      name: 'Grand Concert Hall',
      address: '123 Main Street',
      city: 'New York',
      country: 'USA',
      capacity: 1000,
      seatMap: {
        rows: 10,
        seatsPerRow: 100,
        layout: 'STADIUM',
      },
    },
  });

  console.log('✅ Created venue:', venue.name);

  const event = await prisma.event.create({
    data: {
      title: 'Summer Music Festival',
      description: 'An amazing music festival featuring top artists',
      venueId: venue.id,
      organizerId: admin.id,
      startDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      basePrice: 50.0,
      currency: 'USD',
    },
  });

  console.log('✅ Created event:', event.title);

  const seats = [];
  for (let row = 0; row < 5; row++) {
    for (let seatNum = 1; seatNum <= 20; seatNum++) {
      seats.push({
        eventId: event.id,
        venueId: venue.id,
        row: String.fromCharCode(65 + row),
        number: seatNum,
        type: seatNum <= 5 ? 'VIP' : seatNum <= 10 ? 'PREMIUM' : 'REGULAR',
        status: 'AVAILABLE',
        price: seatNum <= 5 ? 100.0 : seatNum <= 10 ? 75.0 : 50.0,
      });
    }
  }

  await prisma.seat.createMany({
    data: seats,
  });

  console.log('✅ Created seats:', seats.length);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
