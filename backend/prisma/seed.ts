import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with production-like event ticketing data...');

  // 1. Clean existing data (except users to prevent breaking existing logins)
  console.log('   Cleaning old seats, events, and venues...');
  await prisma.seat.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.venue.deleteMany({});

  // 2. Create or find Admin User
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
  console.log('   ✅ Admin User ready:', admin.email);

  // 3. Define Venues
  const venuesData = [
    {
      name: 'Gelora Bung Karno Stadium',
      address: 'Jl. Pintu Satu Senayan, Gelora',
      city: 'Jakarta',
      country: 'Indonesia',
      capacity: 77000,
      description: 'Gelora Bung Karno (GBK) is the largest and most iconic stadium in Indonesia, located in the heart of Jakarta. Recently renovated to international standards, the venue has hosted global acts including Coldplay, BTS, and Ed Sheeran.',
      imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1000',
      seatMap: { rows: 15, seatsPerRow: 30, layout: 'stadium' },
    },
    {
      name: 'Indonesia Convention Exhibition (ICE)',
      address: 'BSD City, Pagedangan',
      city: 'Tangerang',
      country: 'Indonesia',
      capacity: 20000,
      description: 'Indonesia Convention Exhibition (ICE) BSD City is a world-class venue spanning 50,000 m² of exhibition space. Known for hosting major music festivals, anime conventions, and trade shows.',
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1000',
      seatMap: { rows: 12, seatsPerRow: 25, layout: 'hall' },
    },
    {
      name: 'Jakarta Convention Center',
      address: 'Jl. Gatot Subroto, Gelora',
      city: 'Jakarta',
      country: 'Indonesia',
      capacity: 8500,
      description: 'Jakarta Convention Center (JCC) is a landmark venue in Senayan with the iconic shield-shaped roofline, hosting everything from international conferences to K-Pop showcases.',
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1000',
      seatMap: { rows: 10, seatsPerRow: 20, layout: 'hall' },
    },
    {
      name: 'Jakarta International Expo',
      address: 'Jl. Benyamin Sueb No.1, Pademangan',
      city: 'Jakarta',
      country: 'Indonesia',
      capacity: 15000,
      description: 'JIExpo is a sprawling exhibition and entertainment complex in Kemayoran, Central Jakarta, hosting large-scale music festivals and trade shows.',
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1000',
      seatMap: { rows: 12, seatsPerRow: 25, layout: 'hall' },
    },
    {
      name: 'Mahaka Square Bekasi',
      address: 'Jl. Jendral Sudirman No.1',
      city: 'Bekasi',
      country: 'Indonesia',
      capacity: 9000,
      description: 'Mahaka Square Bekasi is a multi-purpose indoor arena in Greater Jakarta, specializing in mid-size concerts, esports tournaments, and family entertainment.',
      imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000',
      seatMap: { rows: 10, seatsPerRow: 20, layout: 'arena' },
    },
    {
      name: 'Rotterdam Rooftop Field',
      address: 'Jl. Embong Malang, Tegalsari',
      city: 'Surabaya',
      country: 'Indonesia',
      capacity: 3500,
      description: 'Rotterdam Rooftop Field is a unique open-air venue on the 7th floor of Tunjungan Plaza 6 in Surabaya, offering sunset views perfect for indie music and jazz.',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000',
      seatMap: { rows: 8, seatsPerRow: 15, layout: 'outdoor' },
    },
  ];

  const dbVenues = [];
  for (const vData of venuesData) {
    const venue = await prisma.venue.create({ data: vData });
    dbVenues.push(venue);
    console.log(`   ✅ Venue Created: ${venue.name}`);
  }

  // 4. Define Events
  const eventsData = [
    {
      title: 'BRING ME THE HORIZON',
      description: 'Bring Me The Horizon returns with their most explosive tour yet. Experience the Post Human: Survival Horror tour live in Jakarta!',
      venueName: 'Gelora Bung Karno Stadium',
      date: '2026-03-15T19:00:00Z',
      basePrice: 750000,
      imageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800',
    },
    {
      title: 'BAD OMENS',
      description: 'Bad Omens brings their critically acclaimed Death Of Peace Of Mind tour to Jakarta. Get ready for an intense night of modern rock and metalcore.',
      venueName: 'Indonesia Convention Exhibition (ICE)',
      date: '2026-05-20T19:00:00Z',
      basePrice: 650000,
      imageUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800',
    },
    {
      title: 'NORTHLANE',
      description: 'Northlane brings their progressive metalcore riffs and electronic soundscapes live to Surabaya for the Character Change Tour.',
      venueName: 'Rotterdam Rooftop Field',
      date: '2026-07-10T19:00:00Z',
      basePrice: 450000,
      imageUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=800',
    },
    {
      title: 'THORNHILL',
      description: 'Australian metal sensations Thornhill live in Bekasi for an intimate showcase of their latest hit record, Moments of Clarity.',
      venueName: 'Mahaka Square Bekasi',
      date: '2026-08-15T19:00:00Z',
      basePrice: 400000,
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800',
    },
    {
      title: 'FIT FOR A KING',
      description: 'Texas metalcore powerhouses Fit For A King live in Jakarta, showcasing their heaviest riffs and massive choruses on the Deathgrip World Tour.',
      venueName: 'Jakarta Convention Center',
      date: '2026-09-05T19:00:00Z',
      basePrice: 550000,
      imageUrl: 'https://images.unsplash.com/photo-1557787163-1635e2efb160?q=80&w=800',
    },
    {
      title: 'COUNTERPARTS',
      description: 'Melodic hardcore pioneers Counterparts live in Kemayoran. Experience raw emotion, crushing breakdowns, and lightning-fast riffs.',
      venueName: 'Jakarta International Expo',
      date: '2026-10-22T19:00:00Z',
      basePrice: 450000,
      imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800',
    },
  ];

  for (const eData of eventsData) {
    const venue = dbVenues.find(v => v.name === eData.venueName);
    if (!venue) continue;

    const startDateTime = new Date(eData.date);
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000); // +3 hours

    const event = await prisma.event.create({
      data: {
        title: eData.title,
        description: eData.description,
        venueId: venue.id,
        organizerId: admin.id,
        startDateTime,
        endDateTime,
        status: 'PUBLISHED',
        basePrice: eData.basePrice,
        currency: 'IDR',
        imageUrl: eData.imageUrl,
      },
    });

    console.log(`   ✅ Event Created: ${event.title}`);

    // Generate seats for the event using the venue's configuration
    const seatMapObj = venue.seatMap as any;
    const rowsCount = seatMapObj.rows;
    const seatsPerRow = seatMapObj.seatsPerRow;

    const seatsToCreate = [];
    for (let r = 0; r < rowsCount; r++) {
      const rowName = String.fromCodePoint(65 + r); // A, B, C...

      let type: 'VIP' | 'PREMIUM' | 'REGULAR' = 'REGULAR';
      let multiplier = 1;

      const positionRatio = r / rowsCount;
      if (positionRatio < 0.2) {
        type = 'VIP';
        multiplier = 2;
      } else if (positionRatio < 0.5) {
        type = 'PREMIUM';
        multiplier = 1.5;
      }

      const price = Number(eData.basePrice) * multiplier;

      for (let s = 1; s <= seatsPerRow; s++) {
        // Randomize status slightly to simulate real activity
        const rand = Math.random();
        let status: 'AVAILABLE' | 'RESERVED' | 'SOLD' = 'AVAILABLE';
        if (rand > 0.85) status = 'SOLD';
        else if (rand > 0.95) status = 'RESERVED';

        seatsToCreate.push({
          eventId: event.id,
          venueId: venue.id,
          row: rowName,
          number: s,
          type: type,
          status: status,
          price: price,
        });
      }
    }

    await prisma.seat.createMany({ data: seatsToCreate });
    console.log(`      Generated ${seatsToCreate.length} seats.`);
  }

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
