import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

/**
 * Generates human-readable, cryptographically collision-resistant booking codes.
 *
 * Format: `BOK-<YYYYMMDD>-<HEX_6>` e.g. `BOK-20260908-A3F1B9`
 *  - Date stamp aids manual lookup and audit trails.
 *  - 3 random bytes → 6 hex chars → ~16.7 million unique codes per day.
 *  - Retry loop (max 3) in the consuming service guards against the ~1 in 16M
 *    probability of collision on the same day.
 */
@Injectable()
export class BookingCodeService {
  /**
   * Produces one collision-resistant booking code.
   *
   * The caller is responsible for the retry loop around the unique-constraint
   * insert, since the retry concerns DB state and belongs in the repository/
   * service layer, not in the generator.
   */
  generate(): string {
    const dateStamp = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `BOK-${dateStamp}-${hex}`;
  }
}
