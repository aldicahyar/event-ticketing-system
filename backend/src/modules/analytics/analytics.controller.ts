import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RangeQueryDto, RevenueQueryDto } from './dto/analytics-query.dto';
import { AnalyticsService, PaymentExportRow } from './analytics.service';

const CSV_COLUMNS: Array<keyof PaymentExportRow> = [
  'payment_date',
  'booking_code',
  'event_title',
  'status',
  'provider',
  'provider_tx_id',
  'currency',
  'amount',
  'refunded_amount',
  'dispute_amount',
  'net_amount',
];

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue KPIs, time series and breakdowns (admin)' })
  revenue(@Query() query: RevenueQueryDto) {
    return this.service.revenue(query.period);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Refund funnel metrics for the last 90 days (admin)' })
  refunds() {
    return this.service.refunds();
  }

  @Get('export')
  @ApiOperation({ summary: 'Per-transaction CSV export for accounting (admin)' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@Query() query: RangeQueryDto, @Res() reply: FastifyReply) {
    const rows = await this.service.export(query.from, query.to);
    const lines = [CSV_COLUMNS.join(',')];
    for (const row of rows) {
      lines.push(CSV_COLUMNS.map((column) => this.service.csvCell(row[column])).join(','));
    }
    // UTF-8 BOM so Excel opens IDR symbols/accents correctly.
    const body = `\uFEFF${lines.join('\r\n')}`;
    reply.header(
      'Content-Disposition',
      `attachment; filename="payments-${query.from}_${query.to}.csv"`,
    );
    return reply.send(body);
  }

  @Get('reconciliation')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'On-demand Stripe Balance reconciliation (admin)' })
  reconciliation(@Query() query: RangeQueryDto) {
    return this.service.reconciliation(query.from, query.to);
  }
}
