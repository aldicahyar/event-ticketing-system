import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePerkDto, UpdatePerkDto } from './perk.dto';

describe('Perk DTO Validation', () => {
  it('CreatePerkDto passes with valid label and type', async () => {
    const dto = plainToInstance(CreatePerkDto, { label: 'Free Drinks', type: 'PERK' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('CreatePerkDto fails with invalid type', async () => {
    const dto = plainToInstance(CreatePerkDto, { label: 'Free Drinks', type: 'DISCOUNT' });
    const errors = await validate(dto);
    const typeError = errors.find((e) => e.property === 'type');
    expect(typeError).toBeDefined();
  });

  it('CreatePerkDto fails with empty label', async () => {
    const dto = plainToInstance(CreatePerkDto, { label: '', type: 'PERK' });
    const errors = await validate(dto);
    const labelError = errors.find((e) => e.property === 'label');
    expect(labelError).toBeDefined();
  });

  it('UpdatePerkDto passes with partial fields (all optional)', async () => {
    const dto = plainToInstance(UpdatePerkDto, { status: 'INACTIVE' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
