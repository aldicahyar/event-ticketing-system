export interface PrivacySection {
  id: string;
  number: number;
  title: string;
  body: PrivacyBlock[];
}

export type PrivacyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'definition'; term: string; definition: string };

export const PRIVACY_META = {
  lastUpdated: 'June 21, 2026',
  effectiveDate: 'June 21, 2026',
};

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'introduction',
    number: 1,
    title: 'Introduction & Acceptance',
    body: [
      {
        type: 'paragraph',
        text: 'This Privacy Policy explains how EventTicket ("we", "us", "our") collects, uses, discloses, and safeguards your personal data when you use our website, mobile applications, and services (collectively, the "Services"). This policy is issued in compliance with Indonesian Law No. 27 of 2022 on Personal Data Protection ("UU PDP") and other applicable Indonesian regulations.',
      },
      {
        type: 'paragraph',
        text: 'By accessing or using the Services, you consent to the data practices described in this Privacy Policy. For general terms governing your use of the Services, please refer to Section 1 of our Terms of Service.',
      },
      {
        type: 'paragraph',
        text: 'This Privacy Policy applies to all Users of the Services, including those who browse without creating an account. If you do not agree with the practices described herein, you must discontinue use of the Services.',
      },
    ],
  },
  {
    id: 'data-collected',
    number: 2,
    title: 'Information We Collect',
    body: [
      {
        type: 'paragraph',
        text: 'We collect personal data necessary to provide ticketing services, process payments, and deliver event access. The categories of data we may collect include:',
      },
      {
        type: 'heading',
        text: 'Data You Provide Directly',
      },
      {
        type: 'definition',
        term: 'Identity Data',
        definition: 'Full name, date of birth, nationality, and government ID number (for events requiring identity verification).',
      },
      {
        type: 'definition',
        term: 'Contact Data',
        definition: 'Email address, phone number, and delivery address for physical ticket or merchandise orders.',
      },
      {
        type: 'definition',
        term: 'Payment Data',
        definition: 'Bank transfer details, e-wallet account identifiers, and card type. We do not store full credit card numbers — payment processing is handled by certified PCI-DSS compliant third parties.',
      },
      {
        type: 'definition',
        term: 'Profile Data',
        definition: 'Username, password (encrypted), profile preferences, and event favorites.',
      },
      {
        type: 'heading',
        text: 'Data Collected Automatically',
      },
      {
        type: 'definition',
        term: 'Usage Data',
        definition: 'IP address, browser type, device information, pages visited, referral source, and timestamps. Collected via cookies and similar technologies.',
      },
      {
        type: 'definition',
        term: 'Transaction Data',
        definition: 'Purchase history, event tickets purchased, order amounts, and payment method used.',
      },
      {
        type: 'definition',
        term: 'Communications Data',
        definition: 'Records of your interactions with our customer support, including tickets submitted and responses provided.',
      },
    ],
  },
  {
    id: 'use-of-data',
    number: 3,
    title: 'How We Use Your Information',
    body: [
      {
        type: 'paragraph',
        text: 'We process your personal data for the following specific, legitimate purposes:',
      },
      {
        type: 'heading',
        text: 'Service Delivery',
      },
      {
        type: 'list',
        items: [
          'Processing ticket purchases and delivering Tickets to you.',
          'Verifying your identity at event entry points where required by the Event Organizer.',
          'Managing your account, authentication, and session security.',
          'Processing payments and issuing invoices or receipts.',
        ],
      },
      {
        type: 'heading',
        text: 'Communication',
      },
      {
        type: 'list',
        items: [
          'Sending order confirmations, event updates, and critical alerts (e.g., event rescheduling).',
          'Responding to your inquiries submitted via Help Center, contact forms, or support tickets.',
          'Sending promotional communications only with your explicit opt-in consent. You can unsubscribe at any time.',
        ],
      },
      {
        type: 'heading',
        text: 'Platform Improvement & Security',
      },
      {
        type: 'list',
        items: [
          'Analyzing usage patterns to improve user experience and recommend relevant events.',
          'Detecting and preventing fraud, scalping, bot activity, and unauthorized resale.',
          'Maintaining audit logs for legal compliance and dispute resolution.',
        ],
      },
    ],
  },
  {
    id: 'legal-basis',
    number: 4,
    title: 'Legal Basis for Processing',
    body: [
      {
        type: 'paragraph',
        text: 'Under UU PDP, we must have a valid legal basis for each processing activity. The legal bases we rely on are:',
      },
      {
        type: 'list',
        items: [
          'Performance of a contract: Processing necessary to deliver the Services you requested (ticket purchase, account creation, payment processing).',
          'Compliance with legal obligation: Processing required to meet obligations under Indonesian tax, financial, and consumer protection laws.',
          'Legitimate interests: Processing for fraud prevention, platform security, and service improvement, provided your rights do not override our interests.',
          'Your consent: Processing for marketing communications, optional profile data, and non-essential cookies. Consent can be withdrawn at any time without affecting service access.',
        ],
      },
      {
        type: 'paragraph',
        text: 'When we process sensitive data (such as government ID numbers for age-restricted events), we rely on explicit consent obtained at the point of collection or legal obligation as required by the Event Organizer.',
      },
    ],
  },
  {
    id: 'cookies',
    number: 5,
    title: 'Cookies & Tracking Technologies',
    body: [
      {
        type: 'paragraph',
        text: 'We use cookies and similar tracking technologies (web beacons, pixels) to operate and improve the Services. A summary of our cookie categories is provided below. For full details, including how to manage or disable cookies, please refer to our Cookie Policy at /cookies.',
      },
      {
        type: 'list',
        items: [
          'Essential cookies: Required for account authentication, session management, and checkout security. Cannot be disabled.',
          'Functional cookies: Remember preferences such as language and saved events.',
          'Analytics cookies: Help us understand how Users interact with the platform to improve usability.',
          'Marketing cookies: Used to deliver relevant event recommendations and measure campaign effectiveness. Optional and consent-based.',
        ],
      },
    ],
  },
  {
    id: 'data-sharing',
    number: 6,
    title: 'Data Sharing & Third Parties',
    body: [
      {
        type: 'paragraph',
        text: 'We do not sell your personal data. We share data only with the categories of recipients described below, and only to the extent necessary for the purposes outlined in this policy.',
      },
      {
        type: 'heading',
        text: 'Recipients',
      },
      {
        type: 'list',
        items: [
          'Event Organizers and Venues: Your name and ticket details may be shared for admission verification and event management.',
          'Payment Processors: Certified third parties (banks, payment gateways) process transactions under their own privacy and security policies.',
          'Service Providers: Cloud hosting, email delivery, SMS notifications, analytics, and customer support tooling — all bound by data processing agreements.',
          'Legal Authorities: When required by Indonesian law, court order, or legitimate law enforcement request.',
        ],
      },
      {
        type: 'paragraph',
        text: 'All third-party processors are contractually obligated to protect your data and may only use it for the purposes we specify. We do not transfer your personal data outside Indonesia except as necessary for cloud infrastructure, in which case appropriate safeguards are in place.',
      },
    ],
  },
  {
    id: 'data-security',
    number: 7,
    title: 'Data Security',
    body: [
      {
        type: 'paragraph',
        text: 'We implement industry-standard technical and organizational measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. These measures include:',
      },
      {
        type: 'list',
        items: [
          'TLS encryption (HTTPS) for all data transmitted between your device and our servers.',
          'AES-256 encryption at rest for stored personal data.',
          'Strict access controls with role-based permissions and audit logging.',
          'Regular security assessments, vulnerability scanning, and penetration testing.',
          'PCI-DSS compliance via certified payment partners (we never store full card numbers).',
        ],
      },
      {
        type: 'paragraph',
        text: 'Despite our efforts, no system can guarantee absolute security. In the event of a personal data breach, we will notify affected Users and the relevant Indonesian authority within 72 hours of becoming aware, as required by UU PDP.',
      },
    ],
  },
  {
    id: 'data-retention',
    number: 8,
    title: 'Data Retention',
    body: [
      {
        type: 'paragraph',
        text: 'We retain your personal data only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by Indonesian law.',
      },
      {
        type: 'list',
        items: [
          'Account data: Retained for the lifetime of your account. Deleted within 30 days of account closure request, except where retention is required by law.',
          'Transaction data: Retained for 5 years to comply with Indonesian tax and financial record-keeping obligations.',
          'Marketing consent: Retained until you withdraw consent or unsubscribe.',
          'Support ticket data: Retained for 2 years after resolution for quality assurance and dispute reference.',
          'Usage logs: Aggregated and anonymized after 90 days; raw logs deleted within 12 months.',
        ],
      },
      {
        type: 'paragraph',
        text: 'When data is no longer needed, it is securely deleted or irreversibly anonymized.',
      },
    ],
  },
  {
    id: 'your-rights',
    number: 9,
    title: 'Your Rights',
    body: [
      {
        type: 'paragraph',
        text: 'Under UU PDP, you have the following rights regarding your personal data. To exercise any of these rights, contact us at privacy@eventticket.id or submit a request through the Help Center.',
      },
      {
        type: 'list',
        items: [
          'Right of access: Request a copy of the personal data we hold about you.',
          'Right to correction: Request correction of inaccurate or incomplete data.',
          'Right to erasure: Request deletion of your data, subject to legal retention obligations.',
          'Right to restrict processing: Request that we limit processing to storage only.',
          'Right to data portability: Request your data in a structured, machine-readable format.',
          'Right to object: Object to processing based on legitimate interests or for marketing purposes.',
          'Right to withdraw consent: Withdraw consent for processing activities that relied on it, without affecting prior lawful processing.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We will respond to verified requests within 30 days. If we deny a request, we will provide the reason and inform you of your right to file a complaint with the Indonesian Data Protection Authority.',
      },
    ],
  },
  {
    id: 'children',
    number: 10,
    title: "Children's Privacy",
    body: [
      {
        type: 'paragraph',
        text: 'Our Services are not directed to children under 17. We do not knowingly collect personal data from individuals under 17 without parental consent. If an Event has a stricter age restriction, it will be clearly stated on the Event page.',
      },
      {
        type: 'paragraph',
        text: 'If you believe we have collected data from a child without appropriate consent, please contact us at privacy@eventticket.id. We will promptly investigate and delete the data if confirmed.',
      },
    ],
  },
  {
    id: 'changes',
    number: 11,
    title: 'Changes to This Policy',
    body: [
      {
        type: 'paragraph',
        text: 'We may update this Privacy Policy from time to time to reflect changes in our data practices or legal requirements. Material changes will be communicated via email or a prominent notice on the Services, using the same mechanism described in Section 11 of our Terms of Service.',
      },
      {
        type: 'paragraph',
        text: 'The "Last Updated" date at the top of this page indicates the most recent revision. Continued use of the Services after changes take effect constitutes acceptance of the updated policy.',
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
        text: 'For privacy-specific inquiries, data subject requests, or questions about this policy, contact our Data Protection team using the dedicated channels below.',
      },
      {
        type: 'list',
        items: [
          'Privacy email: privacy@eventticket.id',
          'Data subject request: Submit via Help Center (/help/contact) with subject "Privacy Request"',
          'Legal email: legal@eventticket.id',
        ],
      },
      {
        type: 'paragraph',
        text: 'For general inquiries unrelated to privacy, please use /contact. Our Help Center (/help) contains articles on account management, data settings, and cookie preferences.',
      },
    ],
  },
];
