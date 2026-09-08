import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

describe('CustomersController', () => {
  const service = {
    getCustomerInfo: jest.fn(),
    createPortalSession: jest.fn(),
  } as unknown as CustomersService;
  const config = {
    get: jest.fn<string, [string]>().mockReturnValue('http://localhost:3001'),
  };
  const controller = new CustomersController(service, config as never);

  beforeEach(() => jest.clearAllMocks());

  it('owner-scopes /customers/me to JWT user id (SEC-1 / IT-6)', async () => {
    (service.getCustomerInfo as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      stripeCustomerId: 'cus_existing',
    });

    const result = await controller.getCustomerInfo({ id: 'user-1' } as never);

    expect(service.getCustomerInfo).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      stripeCustomerId: 'cus_existing',
    });
  });

  it('uses client-provided returnUrl in POST /customers/portal (IT-7)', async () => {
    (service.createPortalSession as jest.Mock).mockResolvedValue(
      'https://billing.stripe.com/session/abc',
    );

    const result = await controller.createPortalSession({ id: 'user-1' } as never, {
      returnUrl: 'https://app.example.com/profile',
    });

    expect(service.createPortalSession).toHaveBeenCalledWith(
      'user-1',
      'https://app.example.com/profile',
    );
    expect(result).toEqual({ url: 'https://billing.stripe.com/session/abc' });
  });

  it('falls back to FRONTEND_URL env var when returnUrl is absent', async () => {
    (service.createPortalSession as jest.Mock).mockResolvedValue(
      'https://billing.stripe.com/session/xyz',
    );

    await controller.createPortalSession({ id: 'user-1' } as never, {});

    expect(config.get).toHaveBeenCalledWith('FRONTEND_URL');
    expect(service.createPortalSession).toHaveBeenCalledWith('user-1', 'http://localhost:3001');
  });
});
