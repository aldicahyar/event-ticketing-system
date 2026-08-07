import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RefundStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { StripeService } from '../../common/stripe/stripe.service';
import { PaymentAuditService } from '../payments/audit/payment-audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundPolicyDto } from './dto/update-policy.dto';
import { RefundPolicyService } from './refund-policy.service';
import {
  REFUND_AUDIT_ACTIONS,
  REFUND_RULE_CODES,
  REFUND_TRANSITIONS,
} from './refunds.constants';
import { RefundsRepository } from './refunds.repository';

export interface RefundActor {
  id: string;
  role: string;
}

@Injectable()
export class RefundsService {
  constructor(
    private readonly repository: RefundsRepository,
    private readonly policyService: RefundPolicyService,
    private readonly stripeService: StripeService,
    private readonly audit: PaymentAuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateRefundDto) {
    const booking = await this.repository.findBookingForRefund(dto.booking_id);
    if (!booking || booking.user_id !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status !== 'CONFIRMED' || !booking.payment || booking.payment.status !== 'COMPLETED') {
      throw new BadRequestException('Only confirmed and paid bookings are eligible for refund');
    }
    if (await this.repository.findActiveByBooking(booking.id)) {
      throw new ConflictException('An active refund request already exists for this booking');
    }

    const evaluation = await this.policyService.evaluate(
      Number(booking.total_price),
      booking.event.status,
      booking.event.start_date_time,
    );
    if (!evaluation.eligible) {
      throw new BadRequestException('This booking is not eligible under the current refund policy');
    }

    const refund = await this.repository.create({
      booking_id: booking.id,
      payment_id: booking.payment.id,
      amount: evaluation.amount,
      currency: booking.currency,
      percentage: evaluation.percentage,
      reason: dto.reason,
      review_note: dto.note,
      requested_by: userId,
    });
    await this.audit.record(userId, REFUND_AUDIT_ACTIONS.REQUESTED, {
      refund_id: refund.id,
      booking_id: booking.id,
      policy_rule: evaluation.ruleCode,
      percentage: evaluation.percentage,
      amount: evaluation.amount,
    });
    await this.notify(refund, 'REQUESTED');
    return refund;
  }

  findMine(userId: string) {
    return this.repository.findMine(userId);
  }

  findAll(actor: RefundActor, status?: string) {
    const parsedStatus = this.parseStatus(status);
    // ADMIN and ORGANIZER both see every refund request. Only ATTENDEE is
    // scoped to their own requests (served via findMine).
    return this.repository.findAll(parsedStatus);
  }

  async findOne(id: string, actor: RefundActor) {
    const refund = await this.getRefund(id);
    const canManage = actor.role === 'ADMIN' || actor.role === 'ORGANIZER';
    if (!canManage && refund.requested_by !== actor.id) {
      throw new ForbiddenException('You cannot access this refund');
    }
    return refund;
  }

  async approve(id: string, actor: RefundActor, note?: string) {
    const refund = await this.getRefund(id);
    this.assertTransition(refund.status, RefundStatus.PROCESSING);

    const evaluation = await this.policyService.evaluate(
      Number(refund.booking.total_price),
      refund.booking.event.status,
      refund.booking.event.start_date_time,
    );
    if (!evaluation.eligible) {
      throw new BadRequestException('Refund is no longer eligible under the current policy');
    }

    const processing = await this.repository.update(id, {
      status: RefundStatus.PROCESSING,
      amount: evaluation.amount,
      percentage: evaluation.percentage,
      reviewed_by: actor.id,
      review_note: note,
      failure_reason: null,
    });

    try {
      const stripeRefund = await this.executeStripeRefund(processing);
      const nextStatus = stripeRefund.status === 'succeeded'
        ? RefundStatus.COMPLETED
        : RefundStatus.PROCESSING;
      const updated = await this.repository.update(id, {
        stripe_refund_id: stripeRefund.id,
        status: nextStatus,
        completed_at: nextStatus === RefundStatus.COMPLETED ? new Date() : null,
      });
      if (nextStatus === RefundStatus.COMPLETED) {
        await this.repository.finalizeRefundedBooking(
          updated.booking_id,
          updated.payment_id,
        );
      }
      await this.audit.record(actor.id, REFUND_AUDIT_ACTIONS.APPROVED, {
        refund_id: id,
        stripe_refund_id: stripeRefund.id,
        amount: evaluation.amount,
        percentage: evaluation.percentage,
        review_note: note ?? null,
      });
      await this.notify(updated, nextStatus);
      return updated;
    } catch (error: unknown) {
      await this.repository.update(id, {
        status: RefundStatus.FAILED,
        failure_reason: this.errorMessage(error),
      });
      await this.audit.record(actor.id, REFUND_AUDIT_ACTIONS.FAILED, {
        refund_id: id,
        reason: this.errorMessage(error),
      });
      throw new BadRequestException('Stripe refund failed; the request can be retried');
    }
  }

  async reject(id: string, actor: RefundActor, note?: string) {
    const refund = await this.getRefund(id);
    this.assertTransition(refund.status, RefundStatus.REJECTED);
    const updated = await this.repository.update(id, {
      status: RefundStatus.REJECTED,
      reviewed_by: actor.id,
      review_note: note,
    });
    await this.audit.record(actor.id, REFUND_AUDIT_ACTIONS.REJECTED, {
      refund_id: id,
      note: note ?? null,
    });
    await this.notify(updated, 'REJECTED', note);
    return updated;
  }

  async retry(id: string, actor: RefundActor) {
    const refund = await this.getRefund(id);
    this.assertTransition(refund.status, RefundStatus.PROCESSING);
    await this.repository.update(id, {
      status: RefundStatus.PROCESSING,
      reviewed_by: actor.id,
      failure_reason: null,
    });
    return this.approveProcessing(id, actor);
  }

  listPolicies() {
    return this.repository.listPolicies();
  }

  listPolicyAudit() {
    return this.repository.listPolicyAudit();
  }

  async updatePolicy(ruleCode: string, dto: UpdateRefundPolicyDto, adminId: string) {
    if (dto.percentage === undefined && dto.is_active === undefined) {
      throw new BadRequestException('At least one policy field must be provided');
    }
    if (!Object.values(REFUND_RULE_CODES).includes(ruleCode as any)) {
      throw new NotFoundException('Refund policy rule not found');
    }
    await this.repository.ensureDefaultPolicies();
    const current = await this.repository.findPolicy(ruleCode);
    if (!current) throw new NotFoundException('Refund policy rule not found');

    const updated = await this.repository.updatePolicy(ruleCode, {
      ...(dto.percentage !== undefined ? { percentage: dto.percentage } : {}),
      ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
      updated_by: adminId,
    });

    const changes: Array<{ field: string; old: string; next: string }> = [];
    if (dto.percentage !== undefined && dto.percentage !== current.percentage) {
      changes.push({ field: 'percentage', old: String(current.percentage), next: String(dto.percentage) });
    }
    if (dto.is_active !== undefined && dto.is_active !== current.is_active) {
      changes.push({ field: 'is_active', old: String(current.is_active), next: String(dto.is_active) });
    }
    await Promise.all(changes.map((change) => this.repository.createPolicyAudit({
      policy_id: current.id,
      field: change.field,
      old_value: change.old,
      new_value: change.next,
      changed_by: adminId,
    })));
    this.policyService.invalidateCache();
    await this.audit.record(adminId, REFUND_AUDIT_ACTIONS.POLICY_UPDATED, {
      rule_code: ruleCode,
      changes,
    });
    return updated;
  }

  private async approveProcessing(id: string, actor: RefundActor) {
    const refund = await this.getRefund(id);
    try {
      const stripeRefund = await this.executeStripeRefund(refund);
      const status = stripeRefund.status === 'succeeded'
        ? RefundStatus.COMPLETED
        : RefundStatus.PROCESSING;
      const updated = await this.repository.update(id, {
        stripe_refund_id: stripeRefund.id,
        status,
        completed_at: status === RefundStatus.COMPLETED ? new Date() : null,
      });
      if (status === RefundStatus.COMPLETED) {
        await this.repository.finalizeRefundedBooking(
          updated.booking_id,
          updated.payment_id,
        );
      }
      await this.audit.record(actor.id, REFUND_AUDIT_ACTIONS.RETRIED, {
        refund_id: id,
        stripe_refund_id: stripeRefund.id,
      });
      return updated;
    } catch (error: unknown) {
      await this.repository.update(id, {
        status: RefundStatus.FAILED,
        failure_reason: this.errorMessage(error),
      });
      throw new BadRequestException('Stripe refund retry failed');
    }
  }

  private async executeStripeRefund(refund: any) {
    let paymentIntentId = refund.booking.payment?.provider_tx_id;
    if (!paymentIntentId) {
      throw new BadRequestException('Payment has no Stripe payment intent');
    }
    // Legacy rows stored the cs_... Checkout Session id instead of the
    // PaymentIntent id. Resolve it so old payments can still be refunded.
    if (paymentIntentId.startsWith('cs_')) {
      const session = await this.stripeService.retrieveCheckoutSession(
        paymentIntentId,
      );
      paymentIntentId = this.paymentIntentIdFromSession(session);
      if (!paymentIntentId) {
        throw new BadRequestException(
          'Checkout session has no Stripe payment intent',
        );
      }
    }
    return this.stripeService.createRefund(
      {
        payment_intent: paymentIntentId,
        amount: Math.round(Number(refund.amount) * 100),
        reason: 'requested_by_customer',
        metadata: {
          refund_request_id: refund.id,
          booking_id: refund.booking_id,
          reason: refund.reason,
        },
      },
      {
        operation: 'refund',
        entityId: refund.payment_id,
        discriminator: refund.id,
        fingerprint: { amount: Number(refund.amount), currency: refund.currency },
      },
    );
  }

  private paymentIntentIdFromSession(
    session: Stripe.Checkout.Session,
  ): string | null {
    const pi = session.payment_intent;
    if (typeof pi === 'string') return pi;
    return (pi as Stripe.PaymentIntent | null)?.id ?? null;
  }

  private async getRefund(id: string) {
    const refund = await this.repository.findById(id);
    if (!refund) throw new NotFoundException('Refund request not found');
    return refund;
  }

  private async getManagedRefund(id: string, actor: RefundActor) {
    const refund = await this.getRefund(id);
    if (actor.role !== 'ADMIN' && actor.role !== 'ORGANIZER') {
      throw new ForbiddenException('You cannot manage refunds');
    }
    return refund;
  }

  private assertTransition(from: RefundStatus, to: RefundStatus): void {
    if (!(REFUND_TRANSITIONS[from] ?? []).includes(to)) {
      throw new ConflictException(`Illegal refund status transition: ${from} -> ${to}`);
    }
  }

  private parseStatus(value?: string): RefundStatus | undefined {
    if (!value) return undefined;
    if (!Object.values(RefundStatus).includes(value as RefundStatus)) {
      throw new BadRequestException('Invalid refund status');
    }
    return value as RefundStatus;
  }

  private async notify(refund: any, status: string, note?: string): Promise<void> {
    const email = refund.requester?.email;
    if (!email) return;
    await this.notifications.sendRefundStatus(email, {
      bookingCode: refund.booking.booking_code,
      eventName: refund.booking.event.title,
      customerName: refund.requester.name,
      refundAmount: Number(refund.amount),
      currency: refund.currency,
      status,
      note,
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
