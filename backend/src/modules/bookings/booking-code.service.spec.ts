import { BookingCodeService } from './booking-code.service';

describe('BookingCodeService (GAP-16)', () => {
  let service: BookingCodeService;

  beforeEach(() => {
    service = new BookingCodeService();
  });

  it('generates a code with prefix BOK-YYYYMMDD-HEX6', () => {
    const code = service.generate();
    // Example: BOK-20260908-A3F1B9
    expect(code).toMatch(/^BOK-\d{8}-[A-F0-9]{6}$/);
  });

  it('uses current UTC date for the date component', () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const code = service.generate();
    expect(code.startsWith(`BOK-${today}-`)).toBe(true);
  });

  it('generates 1,000 distinct codes without collision', () => {
    const codes = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      codes.add(service.generate());
    }

    expect(codes.size).toBe(count);
  });
});
