import { EmailContent } from './email-template.interface';

/**
 * Result of a send attempt — tracks delivery for audit.
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  transport: string;
}

/**
 * Abstract transport contract. Any email provider (SendGrid, AWS SES,
 * SMTP via nodemailer) implements this interface so the NotificationsService
 * stays agnostic of the delivery mechanism.
 */
export interface IEmailTransport {
  /** Human-readable name for logging/audit (e.g. "smtp", "console"). */
  readonly name: string;

  /**
   * Send an email. Must NOT throw — return a failed `EmailSendResult`
   * instead so the caller can log and continue without crashing the
   * payment flow.
   *
   * @param to       Recipient email address.
   * @param content  Rendered email content (subject, html, text).
   */
  send(to: string, content: EmailContent): Promise<EmailSendResult>;
}
