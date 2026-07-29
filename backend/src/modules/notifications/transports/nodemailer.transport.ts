import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailTransport, EmailSendResult } from '../interfaces/email-transport.interface';
import { EmailContent } from '../interfaces/email-template.interface';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

/**
 * SMTP-based email transport using nodemailer.
 *
 * Designed for local development and testing with free SMTP providers
 * (Gmail, Outlook, Yahoo). Works out-of-the-box without needing a custom
 * domain or third-party API — just an App Password from your email provider.
 *
 * Configuration via environment variables:
 *   SMTP_HOST     — e.g. "smtp.gmail.com"
 *   SMTP_PORT     — e.g. 587 (STARTTLS) or 465 (SSL)
 *   SMTP_USER     — your email address (e.g. "you@gmail.com")
 *   SMTP_PASS     — App Password (NOT your regular password)
 *   SMTP_FROM_NAME — Display name (e.g. "EventTix")
 *   SMTP_FROM_EMAIL — Sender address (usually same as SMTP_USER)
 *
 * Limitations of free SMTP (Gmail etc.):
 *   - 500 emails/day max
 *   - No custom domain branding (From: you@gmail.com)
 *   - Deliverability not guaranteed (may land in spam)
 *   - No delivery webhooks or bounce tracking
 *
 * All errors are caught and returned as a failed EmailSendResult so
 * the payment flow never crashes due to an email issue.
 */
@Injectable()
export class NodemailerTransport implements IEmailTransport, OnModuleDestroy {
  private readonly logger = new Logger('EmailTransport:SMTP');
  readonly name = 'smtp';

  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const config = this.readConfig();

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });

    this.fromAddress = `"${config.fromName}" <${config.fromEmail}>`;
  }

  async send(to: string, content: EmailContent): Promise<EmailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
        // Anti-spam headers: improve deliverability and compliance
        headers: {
          'X-Mailer': 'EventTix Notification System',
          'List-Unsubscribe': `<mailto:${this.configService.get<string>('SMTP_USER') ?? 'noreply@eventtix.com'}?subject=Unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Priority': '3',
          'X-Auto-Response-Suppress': 'All',
        },
        // Set Reply-To so customers can reply to the email
        replyTo: this.configService.get<string>('SMTP_USER') ?? this.fromAddress,
        // Ensure proper MIME encoding for HTML emails
        encoding: 'utf-8',
      });

      this.logger.log(`Email sent to ${to} (id: ${info.messageId})`);

      return {
        success: true,
        messageId: info.messageId,
        transport: this.name,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        transport: this.name,
      };
    }
  }

  /**
   * Close the SMTP connection pool cleanly when the app shuts down.
   * Prevents hanging connections in test/CI environments.
   */
  async onModuleDestroy(): Promise<void> {
    this.transporter.close();
  }

  private readConfig(): SmtpConfig {
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? '587');

    return {
      host: this.configService.get<string>('SMTP_HOST') ?? 'smtp.gmail.com',
      port,
      // Port 465 uses implicit SSL; 587 and others use STARTTLS upgrade.
      secure: port === 465,
      user: this.configService.get<string>('SMTP_USER') ?? '',
      pass: this.configService.get<string>('SMTP_PASS') ?? '',
      fromName: this.configService.get<string>('SMTP_FROM_NAME') ?? 'EventTix',
      fromEmail:
        this.configService.get<string>('SMTP_FROM_EMAIL') ??
        this.configService.get<string>('SMTP_USER') ??
        '',
    };
  }
}
