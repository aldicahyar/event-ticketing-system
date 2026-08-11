import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { ConsoleTransport } from './transports/console.transport';
import { NodemailerTransport } from './transports/nodemailer.transport';
import { IEmailTransport } from './interfaces/email-transport.interface';

/**
 * Exports the active email transport so other services receive the correct
 * implementation without knowing which provider is configured.
 *
 * Selection priority (first match wins):
 *   1. SMTP_USER + SMTP_PASS set → NodemailerTransport (Gmail SMTP, local dev)
 *   2. Otherwise                 → ConsoleTransport (terminal fallback)
 *
 * This factory pattern keeps transport selection in one place and makes
 * adding a new provider (e.g. SendGrid, AWS SES) as simple as adding
 * another branch here.
 */
function createEmailTransportFactory(configService: ConfigService): IEmailTransport {
  // Priority 1: SMTP (Gmail/Outlook — works immediately without domain)
  const smtpUser = configService.get<string>('SMTP_USER');
  const smtpPass = configService.get<string>('SMTP_PASS');
  if (smtpUser && smtpPass) {
    return new NodemailerTransport(configService);
  }

  // Priority 2: Console fallback (no config needed)
  return new ConsoleTransport();
}

@Module({
  providers: [
    {
      provide: 'EMAIL_TRANSPORT',
      inject: [ConfigService],
      useFactory: createEmailTransportFactory,
    },
    {
      provide: NotificationsService,
      inject: ['EMAIL_TRANSPORT'],
      useFactory: (transport: IEmailTransport) => new NotificationsService(transport),
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
