export interface TermSection {
  id: string;
  number: number;
  title: string;
  body: TermBlock[];
}

export type TermBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'definition'; term: string; definition: string };

export const TERMS_META = {
  lastUpdated: 'June 21, 2026',
  effectiveDate: 'June 21, 2026',
};

export const TERMS_SECTIONS: TermSection[] = [
  {
    id: 'acceptance',
    number: 1,
    title: 'Acceptance of Terms',
    body: [
      {
        type: 'paragraph',
        text: 'By accessing or using EventTicket ("we", "us", "our"), you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy and Cookie Policy. If you do not agree to these Terms, you must not access or use our website, mobile applications, or services (collectively, the "Services").',
      },
      {
        type: 'paragraph',
        text: 'These Terms constitute a legally binding agreement between you and EventTicket. If you are using the Services on behalf of an entity, you represent that you have authority to bind that entity to these Terms.',
      },
      {
        type: 'paragraph',
        text: 'We may revise these Terms at any time. The "Last Updated" date at the top of this page indicates the most recent revision. Continued use of the Services after changes take effect constitutes acceptance of the updated Terms.',
      },
    ],
  },
  {
    id: 'definitions',
    number: 2,
    title: 'Definitions',
    body: [
      {
        type: 'definition',
        term: '"Event"',
        definition: 'A concert, festival, sports match, theatre production, or any gathering for which tickets are sold through the Services.',
      },
      {
        type: 'definition',
        term: '"Ticket"',
        definition: 'A digital or physical confirmation granting the holder the right to attend a specific Event, subject to the event organizer\'s terms.',
      },
      {
        type: 'definition',
        term: '"Event Organizer"',
        definition: 'The independent third party (promoter, artist management, venue, or sports franchise) responsible for producing and operating an Event.',
      },
      {
        type: 'definition',
        term: '"Venue"',
        definition: 'The physical location where an Event takes place, listed on our platform but operated independently from EventTicket.',
      },
      {
        type: 'definition',
        term: '"User" or "You"',
        definition: 'Any individual who accesses, browses, registers an account, or purchases Tickets through the Services.',
      },
    ],
  },
  {
    id: 'accounts',
    number: 3,
    title: 'User Accounts & Registration',
    body: [
      {
        type: 'paragraph',
        text: 'To purchase Tickets or access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated.',
      },
      {
        type: 'list',
        items: [
          'You must be at least 17 years of age or have parental consent to create an account.',
          'You are responsible for maintaining the confidentiality of your password and for all activity that occurs under your account.',
          'You may not transfer, sell, or assign your account to another party without our written consent.',
          'You agree to notify us immediately of any unauthorized use of your account or any other security breach.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or are linked to resale violations.',
      },
    ],
  },
  {
    id: 'tickets',
    number: 4,
    title: 'Tickets & Purchases',
    body: [
      {
        type: 'paragraph',
        text: 'EventTicket acts as an authorized agent and intermediary platform between you and Event Organizers. We facilitate the sale of Tickets but are not the issuer of the Ticket itself. The Event Organizer retains final authority over admission, seat allocation, and event operations.',
      },
      {
        type: 'heading',
        text: 'Ticket Validity',
      },
      {
        type: 'list',
        items: [
          'Tickets are valid only for the specific Event, date, time, and seat (if applicable) stated on the Ticket.',
          'Tickets are non-transferable unless explicitly permitted by the Event Organizer and processed through official channels.',
          'A Ticket is a revocable license. The Event Organizer may refuse entry for violation of venue rules, intoxication, or prohibited items.',
        ],
      },
      {
        type: 'heading',
        text: 'Purchase Limits',
      },
      {
        type: 'paragraph',
        text: 'To ensure fair access, we may impose purchase limits per Event, per User, or per transaction. Attempting to circumvent these limits via multiple accounts, bots, or scripts is strictly prohibited and will result in order cancellation and account suspension.',
      },
      {
        type: 'paragraph',
        text: 'All sales are subject to availability. We do not guarantee that Tickets will be available for any specific Event or seating category.',
      },
    ],
  },
  {
    id: 'payment',
    number: 5,
    title: 'Payment & Billing',
    body: [
      {
        type: 'paragraph',
        text: 'We accept payment via credit card (Visa, Mastercard), major Indonesian bank transfers (BCA, Mandiri, BNI, BRI), and approved e-wallets (DANA, GoPay, OVO). Prices are displayed in Indonesian Rupiah (IDR) and include applicable taxes unless stated otherwise.',
      },
      {
        type: 'list',
        items: [
          'A per-order service fee and processing fee will be displayed before you confirm your purchase.',
          'Payment is processed at the time of order confirmation. Tickets are reserved only after successful payment authorization.',
          'You authorize us to charge the selected payment method for the full amount, including all disclosed fees.',
          'In the event of a declined transaction or chargeback dispute, we reserve the right to cancel the corresponding Tickets.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Pricing errors may occur. If we discover an error in the price of Tickets you have ordered, we will inform you as soon as possible and offer the option to confirm at the correct price or cancel for a full refund.',
      },
    ],
  },
  {
    id: 'refunds',
    number: 6,
    title: 'Refunds & Cancellations',
    body: [
      {
        type: 'paragraph',
        text: 'All sales are final. Refunds are issued only under specific circumstances as outlined in our Refund Policy. The summary below is provided for convenience; the full policy at /refund governs in case of conflict.',
      },
      {
        type: 'heading',
        text: 'Eligible for Refund',
      },
      {
        type: 'list',
        items: [
          'Event is cancelled by the Event Organizer.',
          'Event is rescheduled and you cannot attend the new date (must claim within 30 days of announcement).',
          'Event is significantly altered (e.g., headliner change declared as material by the organizer).',
        ],
      },
      {
        type: 'heading',
        text: 'Not Eligible for Refund',
      },
      {
        type: 'list',
        items: [
          'You are unable to attend for personal reasons (schedule conflict, illness, travel disruption).',
          'You are denied entry for violating venue rules or prohibited conduct.',
          'You purchased Tickets from an unauthorized reseller (we only honor our own resale channels, if enabled).',
          'You failed to claim your refund within the stated window after a rescheduled event.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Approved refunds will be processed to the original payment method within 7-14 business days. Service and processing fees are non-refundable except in cases of organizer-initiated cancellation.',
      },
    ],
  },
  {
    id: 'conduct',
    number: 7,
    title: 'User Conduct & Prohibited Actions',
    body: [
      {
        type: 'paragraph',
        text: 'You agree not to misuse the Services or assist anyone else in doing so. The following actions are strictly prohibited and may result in immediate account termination, order cancellation, and legal action:',
      },
      {
        type: 'list',
        items: [
          'Using bots, scripts, or automated tools to purchase Tickets or scrape content.',
          'Purchasing Tickets with the primary intent of reselling above face value.',
          'Reselling Tickets through unauthorized channels or third-party marketplaces.',
          'Creating multiple accounts to bypass purchase limits.',
          'Using stolen, fraudulent, or unauthorized payment methods.',
          'Attempting to access our systems, databases, or another User\'s account without authorization.',
          'Posting false, misleading, or abusive content in reviews, comments, or support tickets.',
          'Reproducing, modifying, or distributing our content without written permission.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We cooperate with law enforcement and Event Organizers in investigating suspected fraud, scalping, and unauthorized resale. Reports of misuse may be referred to the relevant Indonesian authorities where applicable.',
      },
    ],
  },
  {
    id: 'ip',
    number: 8,
    title: 'Intellectual Property',
    body: [
      {
        type: 'paragraph',
        text: 'The Services, including all text, graphics, logos, icons, images, audio, software, and the EventTicket brand, are the property of EventTicket or its licensors and are protected by Indonesian and international intellectual property laws.',
      },
      {
        type: 'list',
        items: [
          'You may not use, copy, modify, or distribute our content for commercial purposes without prior written consent.',
          'Event names, artist names, team names, and logos remain the property of their respective owners and are displayed on our platform for informational purposes only.',
          'Trademarks, service marks, and trade dress may not be used in connection with any product or service without the owner\'s authorization.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We grant you a limited, non-exclusive, non-transferable license to access the Services for personal, non-commercial use during the term of these Terms.',
      },
    ],
  },
  {
    id: 'disclaimer',
    number: 9,
    title: 'Disclaimers & Limitation of Liability',
    body: [
      {
        type: 'paragraph',
        text: 'The Services are provided on an "as is" and "as available" basis. To the fullest extent permitted by Indonesian law, we disclaim all warranties, express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      },
      {
        type: 'heading',
        text: 'Event-Related Disclaimers',
      },
      {
        type: 'list',
        items: [
          'We are not responsible for the conduct, quality, safety, or cancellation of any Event.',
          'We do not guarantee that the Event will meet your expectations or that Tickets will grant uninterrupted entry.',
          'Event Organizers and Venues are independent third parties; disputes regarding Event experience should be directed to them.',
        ],
      },
      {
        type: 'heading',
        text: 'Limitation of Liability',
      },
      {
        type: 'paragraph',
        text: 'To the maximum extent permitted by applicable law, in no event shall EventTicket be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or related to your use of the Services. Our total liability for any claim shall not exceed the amount you paid to us for the Tickets giving rise to the claim.',
      },
    ],
  },
  {
    id: 'governing-law',
    number: 10,
    title: 'Governing Law & Dispute Resolution',
    body: [
      {
        type: 'paragraph',
        text: 'These Terms shall be governed by and construed in accordance with the laws of the Republic of Indonesia, without regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms or the Services shall be subject to the jurisdiction of the courts of Jakarta, Indonesia.',
      },
      {
        type: 'paragraph',
        text: 'We encourage Users to first contact us informally to attempt resolution of any dispute. If informal resolution fails, the dispute shall be submitted to mediation under the Indonesian National Board of Arbitration (BANI) before proceeding to litigation, unless prohibited by applicable law.',
      },
      {
        type: 'paragraph',
        text: 'You and EventTicket agree that any claim or dispute must be brought within one (1) year after the events giving rise to the claim occurred, after which the claim is permanently barred.',
      },
    ],
  },
  {
    id: 'changes',
    number: 11,
    title: 'Changes to These Terms',
    body: [
      {
        type: 'paragraph',
        text: 'We reserve the right to modify these Terms at any time. When we make material changes, we will update the "Last Updated" date at the top of this page and, where appropriate, notify Users via email or a prominent notice on the Services.',
      },
      {
        type: 'paragraph',
        text: 'Material changes include modifications to refund eligibility, payment processing, user conduct rules, liability limitations, and dispute resolution. Minor clarifications or formatting changes may be made without direct notification.',
      },
      {
        type: 'paragraph',
        text: 'Your continued use of the Services after the effective date of any revised Terms constitutes your acceptance of the changes. If you do not agree to the revised Terms, you must stop using the Services.',
      },
    ],
  },
  {
    id: 'contact',
    number: 12,
    title: 'Contact Us',
    body: [
      {
        type: 'paragraph',
        text: 'If you have any questions, concerns, or requests regarding these Terms of Service, please contact us using the channels below.',
      },
      {
        type: 'list',
        items: [
          'Help Center: /help',
          'Support Ticket: /help/contact',
          'General Inquiries: /contact',
        ],
      },
      {
        type: 'paragraph',
        text: 'For legal notices specifically, you may email legal@eventticket.id. We aim to respond to all legitimate inquiries within 2 business days.',
      },
    ],
  },
];
