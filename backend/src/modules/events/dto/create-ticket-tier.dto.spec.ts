import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTicketTierDto } from './create-ticket-tier.dto';

describe('CreateTicketTierDto Validation', () => {
  it('should pass validation with valid ticket tier data', async () => {
    const rawData = {
      name: 'VIP Front Row',
      price: 750000,
      stock: 100,
      description: 'Includes meet & greet pass',
      start_date_time: '2026-08-01T10:00:00.000Z',
      end_date_time: '2026-08-10T23:59:59.000Z',
    };

    const dto = plainToInstance(CreateTicketTierDto, rawData);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail validation when price is less than or equal to 0', async () => {
    const rawData = {
      name: 'Free Ticket',
      price: 0,
      stock: 50,
      start_date_time: '2026-08-01T10:00:00.000Z',
      end_date_time: '2026-08-10T23:59:59.000Z',
    };

    const dto = plainToInstance(CreateTicketTierDto, rawData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const priceError = errors.find((e) => e.property === 'price');
    expect(priceError).toBeDefined();
    expect(priceError?.constraints?.min).toContain('Price must be greater than 0');
  });

  it('should fail validation when stock is negative', async () => {
    const rawData = {
      name: 'Regular',
      price: 200000,
      stock: -5,
      start_date_time: '2026-08-01T10:00:00.000Z',
      end_date_time: '2026-08-10T23:59:59.000Z',
    };

    const dto = plainToInstance(CreateTicketTierDto, rawData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const stockError = errors.find((e) => e.property === 'stock');
    expect(stockError).toBeDefined();
    expect(stockError?.constraints?.min).toContain('Stock cannot be negative');
  });

  it('should fail validation when name is too short', async () => {
    const rawData = {
      name: 'A',
      price: 200000,
      stock: 20,
      start_date_time: '2026-08-01T10:00:00.000Z',
      end_date_time: '2026-08-10T23:59:59.000Z',
    };

    const dto = plainToInstance(CreateTicketTierDto, rawData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const nameError = errors.find((e) => e.property === 'name');
    expect(nameError).toBeDefined();
  });

  it('should fail validation when dates are not valid date strings', async () => {
    const rawData = {
      name: 'Regular',
      price: 200000,
      stock: 20,
      start_date_time: 'invalid-date',
      end_date_time: 'invalid-date',
    };

    const dto = plainToInstance(CreateTicketTierDto, rawData);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const startError = errors.find((e) => e.property === 'start_date_time');
    const endError = errors.find((e) => e.property === 'end_date_time');
    expect(startError).toBeDefined();
    expect(endError).toBeDefined();
  });
});
