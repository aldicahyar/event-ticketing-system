import { Role } from '../src/modules/auth/dto/auth.dto';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Impact & Risk Assessment Integration Tests...\n');

  const timestamp = Date.now();
  const attendeeEmail = `attendee-${timestamp}@example.com`;
  const adminEmail = `admin-${timestamp}@example.com`;
  const password = 'SecureP@ss123!';

  let attendeeToken = '';
  let adminToken = '';

  // 1. Register Attendee
  console.log(`[Test] Registering Attendee: ${attendeeEmail}`);
  const regAttendeeRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: attendeeEmail,
      name: 'Test Attendee',
      password,
      confirmPassword: password,
      role: Role.ATTENDEE,
    }),
  });
  if (!regAttendeeRes.ok) {
    throw new Error(`Failed to register attendee: ${await regAttendeeRes.text()}`);
  }
  const regAttendeeData = (await regAttendeeRes.json()) as any;
  attendeeToken = regAttendeeData.data.accessToken;
  console.log('   ✅ Attendee registered successfully.');

  // 2. Register Admin
  console.log(`[Test] Registering Admin: ${adminEmail}`);
  const regAdminRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      name: 'Test Admin',
      password,
      confirmPassword: password,
      role: Role.ADMIN,
    }),
  });
  if (!regAdminRes.ok) {
    throw new Error(`Failed to register admin: ${await regAdminRes.text()}`);
  }
  const regAdminData = (await regAdminRes.json()) as any;
  adminToken = regAdminData.data.accessToken;
  console.log('   ✅ Admin registered successfully.');

  // 3. Verify GET /venues works (public endpoint)
  console.log('[Test] GET /venues (retrieve all venues)');
  const getVenuesRes = await fetch(`${BASE_URL}/venues`);
  if (!getVenuesRes.ok) {
    throw new Error(`GET /venues failed: ${await getVenuesRes.text()}`);
  }
  const venuesListData = (await getVenuesRes.json()) as any;
  if (!Array.isArray(venuesListData.data)) {
    throw new Error('GET /venues did not return an array of venues');
  }
  console.log(`   ✅ GET /venues returned ${venuesListData.data.length} venues.`);

  // 4. Verify RolesGuard: Attendee attempts to create a venue -> Should be rejected (403 or 401)
  console.log('[Test] RolesGuard: Attendee tries to create a venue (POST /venues/create)');
  const createVenueAttendeeRes = await fetch(`${BASE_URL}/venues/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${attendeeToken}`,
    },
    body: JSON.stringify({
      name: 'Forbidden Venue',
      address: 'Some Address',
      city: 'Jakarta',
      country: 'Indonesia',
      capacity: 100,
      seatMap: { rows: 5, seatsPerRow: 20 },
    }),
  });
  console.log(`   Response status: ${createVenueAttendeeRes.status}`);
  if (createVenueAttendeeRes.status !== 403 && createVenueAttendeeRes.status !== 401) {
    throw new Error(`Expected 401 or 403, got ${createVenueAttendeeRes.status}`);
  }
  console.log('   ✅ Guard correctly rejected unauthorized attendee request to create venue.');

  // 5. Verify RolesGuard: Attendee attempts to create an event -> Should be rejected
  console.log('[Test] RolesGuard: Attendee tries to create an event (POST /events/create)');
  const createEventAttendeeRes = await fetch(`${BASE_URL}/events/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${attendeeToken}`,
    },
    body: JSON.stringify({
      title: 'Forbidden Event',
      description: 'An event that should not be created.',
      venueId: 'some-id',
      startDateTime: '2026-12-01T19:00:00.000Z',
      endDateTime: '2026-12-01T22:00:00.000Z',
      basePrice: 100000,
    }),
  });
  console.log(`   Response status: ${createEventAttendeeRes.status}`);
  if (createEventAttendeeRes.status !== 403 && createEventAttendeeRes.status !== 401) {
    throw new Error(`Expected 401 or 403, got ${createEventAttendeeRes.status}`);
  }
  console.log('   ✅ Guard correctly rejected unauthorized attendee request to create event.');

  // 6. Admin creates Venue 1 (Capacity 100)
  console.log('[Test] Admin creates Venue 1 (POST /venues/create)');
  const createVenue1Res = await fetch(`${BASE_URL}/venues/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Venue One (Capacity 100)',
      address: 'Main Street 1',
      city: 'Jakarta',
      country: 'Indonesia',
      capacity: 100,
      seatMap: { rows: 5, seatsPerRow: 20, layout: 'stadium' },
    }),
  });
  if (!createVenue1Res.ok) {
    throw new Error(`Failed to create Venue 1: ${await createVenue1Res.text()}`);
  }
  const venue1Data = (await createVenue1Res.json()) as any;
  const venue1Id = venue1Data.data.id;
  console.log(`   ✅ Venue 1 created with ID: ${venue1Id}`);

  // 7. Verify GET /venues/:id detail endpoint works
  console.log(`[Test] GET /venues/:id (retrieve Venue 1 details)`);
  const getVenueDetailRes = await fetch(`${BASE_URL}/venues/${venue1Id}`);
  if (!getVenueDetailRes.ok) {
    throw new Error(`GET /venues/:id failed: ${await getVenueDetailRes.text()}`);
  }
  const venueDetailData = (await getVenueDetailRes.json()) as any;
  if (venueDetailData.data.name !== 'Venue One (Capacity 100)') {
    throw new Error(
      `Venue name mismatch: expected "Venue One (Capacity 100)", got "${venueDetailData.data.name}"`,
    );
  }
  console.log('   ✅ GET /venues/:id returned correct details.');

  // 8. Admin creates Event at Venue 1
  console.log('[Test] Admin creates Event at Venue 1 (POST /events/create)');
  const basePrice = 100000;
  const createEventRes = await fetch(`${BASE_URL}/events/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Event at Venue 1',
      description: 'A test event to verify seat map generation.',
      venueId: venue1Id,
      startDateTime: '2026-12-01T19:00:00.000Z',
      endDateTime: '2026-12-01T22:00:00.000Z',
      basePrice,
      status: 'PUBLISHED',
    }),
  });
  if (!createEventRes.ok) {
    throw new Error(`Failed to create Event: ${await createEventRes.text()}`);
  }
  const eventData = (await createEventRes.json()) as any;
  const eventId = eventData.data.id;
  console.log(`   ✅ Event created with ID: ${eventId}`);

  // 9. Fetch event and check generated seat capacity & pricing logic
  console.log(`[Test] GET /events/:id (verify seat map capacity and tiers)`);
  const getEventRes = await fetch(`${BASE_URL}/events/${eventId}`);
  if (!getEventRes.ok) {
    throw new Error(`GET /events/:id failed: ${await getEventRes.text()}`);
  }
  const eventDetails = (await getEventRes.json()) as any;
  const seats = eventDetails.data.seats || [];
  console.log(`   Total seats generated: ${seats.length}`);
  if (seats.length !== 100) {
    throw new Error(`Expected 100 generated seats, but found ${seats.length}`);
  }

  // Check rows and types
  const rows = new Set(seats.map((s: any) => s.row));
  console.log(`   Seat rows generated: ${Array.from(rows).join(', ')}`);
  if (rows.size !== 5) {
    throw new Error(`Expected 5 seat rows (A-E), found ${rows.size}`);
  }

  const vipSeats = seats.filter((s: any) => s.type === 'VIP');
  const premiumSeats = seats.filter((s: any) => s.type === 'PREMIUM');
  const regularSeats = seats.filter((s: any) => s.type === 'REGULAR');
  console.log(
    `   VIP Seats: ${vipSeats.length}, Premium Seats: ${premiumSeats.length}, Regular Seats: ${regularSeats.length}`,
  );
  if (vipSeats.length === 0 || premiumSeats.length === 0 || regularSeats.length === 0) {
    throw new Error('Expected seats to be divided into VIP, PREMIUM, and REGULAR tiers');
  }

  // Verify VIP pricing (VIP multiplier is 2x basePrice)
  if (Number(vipSeats[0].price) !== basePrice * 2) {
    throw new Error(`VIP seat price mismatch: expected ${basePrice * 2}, got ${vipSeats[0].price}`);
  }
  console.log('   ✅ Seat map correctly generated tiers and prices.');

  // 10. Admin creates Venue 2 (Capacity 60: 3 rows x 20 seats)
  console.log('[Test] Admin creates Venue 2 (POST /venues/create)');
  const createVenue2Res = await fetch(`${BASE_URL}/venues/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Venue Two (Capacity 60)',
      address: 'Main Street 2',
      city: 'Surabaya',
      country: 'Indonesia',
      capacity: 60,
      seatMap: { rows: 3, seatsPerRow: 20, layout: 'hall' },
    }),
  });
  if (!createVenue2Res.ok) {
    throw new Error(`Failed to create Venue 2: ${await createVenue2Res.text()}`);
  }
  const venue2Data = (await createVenue2Res.json()) as any;
  const venue2Id = venue2Data.data.id;
  console.log(`   ✅ Venue 2 created with ID: ${venue2Id}`);

  // 11. Admin updates Event to swap Venue 1 with Venue 2
  console.log(`[Test] Swapping Event Venue from Venue 1 to Venue 2 (POST /events/update)`);
  const updateEventRes = await fetch(`${BASE_URL}/events/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      id: eventId,
      venueId: venue2Id,
    }),
  });
  if (!updateEventRes.ok) {
    throw new Error(`Failed to update Event venue: ${await updateEventRes.text()}`);
  }
  console.log('   ✅ Event updated successfully.');

  // 12. Verify seats have been wiped and regenerated for Venue 2
  console.log('[Test] GET /events/:id (verify seat map regenerated for new Venue)');
  const getEventRes2 = await fetch(`${BASE_URL}/events/${eventId}`);
  if (!getEventRes2.ok) {
    throw new Error(`GET /events/:id failed: ${await getEventRes2.text()}`);
  }
  const eventDetails2 = (await getEventRes2.json()) as any;
  const seats2 = eventDetails2.data.seats || [];
  console.log(`   Total seats after venue swap: ${seats2.length}`);
  if (seats2.length !== 60) {
    throw new Error(`Expected 60 generated seats, but found ${seats2.length}`);
  }

  // Ensure only seats for Venue 2 exist for this event
  const oldVenueSeats = seats2.filter((s: any) => s.venueId === venue1Id);
  if (oldVenueSeats.length > 0) {
    throw new Error(`Found ${oldVenueSeats.length} dangling seats from the old venue!`);
  }
  console.log('   ✅ Old seats wiped completely and new seats spawned matching the new Venue.');

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! No issues found.');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
