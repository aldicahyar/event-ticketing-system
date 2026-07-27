import { Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

/**
 * Centralized HTML sanitization for user-authored rich-text content.
 *
 * Rich-text bodies (CMS pages, and later event descriptions) are stored as HTML
 * and rendered with dangerouslySetInnerHTML on the client, so they MUST be
 * sanitized server-side on write — never trust the editor output. This service
 * is the single place that defines the allowlist.
 */
@Injectable()
export class HtmlSanitizerService {
  private readonly options: sanitizeHtml.IOptions = {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'a', 'ul', 'ol', 'li', 'blockquote', 'hr', 'br',
      'strong', 'em', 'u', 's', 'code', 'pre', 'span',
      'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      span: ['class'],
      '*': ['class'],
    },
    // Only http(s), mailto and root-relative URLs (our own /uploads assets).
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      // Every external link opens safely and cannot manipulate the opener.
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }, true),
    },
  };

  /** Returns sanitized HTML safe to persist and render. Null/empty → ''. */
  sanitize(dirty?: string | null): string {
    if (!dirty) return '';
    return sanitizeHtml(dirty, this.options);
  }
}
