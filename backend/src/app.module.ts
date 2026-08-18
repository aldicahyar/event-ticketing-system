import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { UsersModule } from './modules/users/users.module';
import { VenuesModule } from './modules/venues/venues.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { MediaModule } from './modules/media/media.module';
import { PagesModule } from './modules/pages/pages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { DatabaseModule } from './common/database/database.module';
import { StorageModule } from './common/storage/storage.module';
import { RedisModule } from './common/redis/redis.module';
import { StripeModule } from './common/stripe/stripe.module';
import { WebSocketModule } from './websocket/websocket.module';
import { HealthModule } from './common/modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    DatabaseModule,
    StorageModule,
    RedisModule,
    StripeModule,
    WebSocketModule,
    HealthModule,
    NotificationsModule,
    AuthModule,
    EventsModule,
    BookingsModule,
    PaymentsModule,
    RefundsModule,
    DisputesModule,
    UsersModule,
    VenuesModule,
    AnalyticsModule,
    SettingsModule,
    RbacModule,
    MediaModule,
    PagesModule,
  ],
})
export class AppModule {}
