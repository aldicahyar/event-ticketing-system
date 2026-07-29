import { Injectable, Logger } from '@nestjs/common';
import { IEmailTransport, EmailSendResult } from '../interfaces/email-transport.interface';
import { EmailContent } from '../interfaces/email-template.interface';

/**
 * Development-only email transport that logs email content to the console
 * instead of sending it over the network. Used automatically when no
 * SMTP credentials are configured.
 *
 * This ensures the notification system works out-of-the-box in local
 * development without requiring an external email provider account.
 */
@Injectable()
export class ConsoleTransport implements IEmailTransport {
  private readonly logger = new Logger('EmailTransport:Console');
  readonly name = 'console';

  async send(to: string, content: EmailContent): Promise<EmailSendResult> {
    const separator = '─'.repeat(60);
    this.logger.log(
      [
        separator,
        `To:      ${to}`,
        `Subject: ${content.subject}`,
        separator,
        content.text,
        separator,
      ].join('\n'),
    );

    return {
      success: true,
      messageId: `console-${Date.now()}`,
      transport: this.name,
    };
  }
}
