import { PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  const service = {
    listPayments: jest.fn(),
    paymentDetail: jest.fn(),
    refundPayment: jest.fn(),
    activity: jest.fn(),
  } as unknown as AdminService;
  const controller = new AdminController(service);

  it.each([
    ['listPayments', 'DASHBOARD_OPS', 'view'],
    ['paymentDetail', 'DASHBOARD_OPS', 'view'],
    ['refund', 'DASHBOARD_OPS', 'edit'],
    ['activity', 'DASHBOARD_ACTIVITY', 'view'],
  ])('guards %s with %s:%s', (method, menu_code, action) => {
    expect(
      Reflect.getMetadata(
        PERMISSION_KEY,
        AdminController.prototype[method as keyof AdminController] as unknown as object,
      ),
    ).toEqual({ menu_code, action });
  });

  it('maps refund actor + note from the request', () => {
    controller.refund('pay-1', { note: 'duplicate charge' } as never, {
      id: 'admin-9',
      role_code: 'ADMIN',
    } as never);
    expect(service.refundPayment).toHaveBeenCalledWith(
      'pay-1',
      { id: 'admin-9', role: 'ADMIN' },
      'duplicate charge',
    );
  });
});
