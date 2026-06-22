export interface CookieSection {
  id: string;
  number: number;
  title: string;
  body: CookieBlock[];
}

export type CookieBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; caption: string; columns: string[]; rows: CookieRow[] };

export interface CookieRow {
  name: string;
  provider: string;
  purpose: string;
  type: 'Essential' | 'Functional' | 'Analytics' | 'Marketing';
  duration: string;
}

export const COOKIES_META = {
  lastUpdated: 'June 21, 2026',
  effectiveDate: 'June 21, 2026',
};

export const COOKIE_SECTIONS: CookieSection[] = [
  {
    id: 'introduction',
    number: 1,
    title: 'Introduction & What Are Cookies',
    body: [
      {
        type: 'paragraph',
        text: 'This Cookie Policy explains how EventTicket ("we", "us", "our") uses cookies and similar tracking technologies on our website and mobile applications (collectively, the "Services"). This policy should be read alongside our Privacy Policy at /privacy, which explains how we handle your personal data more broadly.',
      },
      {
        type: 'paragraph',
        text: 'Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work efficiently and to provide information to site owners. Cookies do not contain viruses, cannot install malware, and by themselves cannot personally identify you — though they may be linked to information we hold about you.',
      },
      {
        type: 'paragraph',
        text: 'By using the Services, you consent to the use of cookies as described below. You can manage or disable non-essential cookies at any time through your browser settings or our cookie preferences.',
      },
    ],
  },
  {
    id: 'types',
    number: 2,
    title: 'Types of Cookies We Use',
    body: [
      {
        type: 'paragraph',
        text: 'We classify cookies into four categories based on their purpose and necessity:',
      },
      {
        type: 'heading',
        text: 'Essential Cookies',
      },
      {
        type: 'paragraph',
        text: 'Required for the core functionality of the Services. Without these, features like account login, checkout, and security cannot operate. These cannot be disabled.',
      },
      {
        type: 'heading',
        text: 'Functional Cookies',
      },
      {
        type: 'paragraph',
        text: 'Enhance your experience by remembering preferences such as language, region, and saved events. These are optional and can be disabled without breaking core functionality.',
      },
      {
        type: 'heading',
        text: 'Analytics Cookies',
      },
      {
        type: 'paragraph',
        text: 'Help us understand how Users interact with the platform — which pages are visited, which features are used, and where errors occur. This data is aggregated and anonymous.',
      },
      {
        type: 'heading',
        text: 'Marketing Cookies',
      },
      {
        type: 'paragraph',
        text: 'Used to deliver relevant event recommendations and measure the effectiveness of promotional campaigns. Optional and consent-based. If disabled, you will still see the same number of events — they just may be less relevant to your interests.',
      },
    ],
  },
  {
    id: 'cookies-we-use',
    number: 3,
    title: 'Cookies We Use',
    body: [
      {
        type: 'paragraph',
        text: 'The table below lists the specific cookies set when you use the Services. Duration indicates how long the cookie remains on your device after your last visit.',
      },
      {
        type: 'table',
        caption: 'All cookies deployed by EventTicket and approved third parties',
        columns: ['Cookie', 'Provider', 'Purpose', 'Type', 'Duration'],
        rows: [
          {
            name: 'et_session',
            provider: 'eventticket.id',
            purpose: 'Maintains your logged-in session across pages',
            type: 'Essential',
            duration: '24 hours',
          },
          {
            name: 'et_csrf',
            provider: 'eventticket.id',
            purpose: 'Prevents cross-site request forgery attacks on forms',
            type: 'Essential',
            duration: 'Session',
          },
          {
            name: 'et_cart',
            provider: 'eventticket.id',
            purpose: 'Stores items added to your cart before checkout',
            type: 'Essential',
            duration: '7 days',
          },
          {
            name: 'et_prefs',
            provider: 'eventticket.id',
            purpose: 'Remembers language, region, and display preferences',
            type: 'Functional',
            duration: '1 year',
          },
          {
            name: 'et_favorites',
            provider: 'eventticket.id',
            purpose: 'Stores your favorited events and artists',
            type: 'Functional',
            duration: '1 year',
          },
          {
            name: '_ga',
            provider: 'Google Analytics',
            purpose: 'Distinguishes unique Users for aggregate usage statistics',
            type: 'Analytics',
            duration: '2 years',
          },
          {
            name: '_gid',
            provider: 'Google Analytics',
            purpose: 'Distinguishes Users for daily session tracking',
            type: 'Analytics',
            duration: '24 hours',
          },
          {
            name: 'et_campaign',
            provider: 'eventticket.id',
            purpose: 'Tracks which marketing campaign referred you to us',
            type: 'Marketing',
            duration: '30 days',
          },
          {
            name: '_fbp',
            provider: 'Meta Platforms',
            purpose: 'Delivers relevant event ads on Facebook and Instagram',
            type: 'Marketing',
            duration: '90 days',
          },
        ],
      },
    ],
  },
  {
    id: 'third-party',
    number: 4,
    title: 'Third-Party Cookies',
    body: [
      {
        type: 'paragraph',
        text: 'Some cookies are set by third-party services we integrate with. These third parties have their own privacy policies governing how they use the data collected. We only work with providers who meet our security and privacy standards.',
      },
      {
        type: 'list',
        items: [
          'Google Analytics: Web analytics to help us understand and improve platform performance. Data is anonymized and aggregated.',
          'Meta Pixel: Campaign measurement for events promoted on Facebook and Instagram. Only active with your marketing consent.',
          'Payment Gateways (Midtrans, Xendit): Session cookies during checkout to process transactions securely. These are essential and cannot be disabled.',
          'Maps Provider: If you interact with embedded maps on venue pages, a mapping provider may set cookies for rendering and analytics.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We do not allow third parties to use cookies for purposes other than those described above without your explicit consent.',
      },
    ],
  },
  {
    id: 'managing',
    number: 5,
    title: 'Managing & Disabling Cookies',
    body: [
      {
        type: 'paragraph',
        text: 'You have several options for controlling how cookies are used on your device:',
      },
      {
        type: 'heading',
        text: 'Browser Settings',
      },
      {
        type: 'paragraph',
        text: 'All modern browsers allow you to manage cookie preferences through their settings. You can block all cookies, accept only first-party cookies, or delete existing cookies. Note that disabling essential cookies will prevent you from logging in, purchasing tickets, and using checkout.',
      },
      {
        type: 'list',
        items: [
          'Chrome: Settings > Privacy and security > Cookies and other site data',
          'Firefox: Settings > Privacy & Security > Cookies and Site Data',
          'Safari: Preferences > Privacy > Cookies and website data',
          'Edge: Settings > Cookies and site permissions',
        ],
      },
      {
        type: 'heading',
        text: 'Cookie Preferences',
      },
      {
        type: 'paragraph',
        text: 'When you first visit the Services, a cookie banner allows you to accept or reject non-essential cookies. You can revisit and change your preferences at any time through the cookie settings link in the footer. Essential cookies are always active and cannot be disabled.',
      },
      {
        type: 'heading',
        text: 'Do Not Track',
      },
      {
        type: 'paragraph',
        text: 'Your browser may offer a "Do Not Track" signal. We respond to DNT signals by disabling analytics and marketing cookies while keeping essential and functional cookies active.',
      },
    ],
  },
  {
    id: 'impact',
    number: 6,
    title: 'Impact of Disabling Cookies',
    body: [
      {
        type: 'paragraph',
        text: 'Disabling cookies affects the Services in different ways depending on which category you block:',
      },
      {
        type: 'list',
        items: [
          'Essential cookies disabled: You cannot log in, complete purchases, or access account features. The Services become effectively unusable.',
          'Functional cookies disabled: Preferences are not remembered. You must reselect language, region, and favorites each visit. Core functionality remains intact.',
          'Analytics cookies disabled: We lose the ability to measure and improve platform performance. Your experience is unaffected directly.',
          'Marketing cookies disabled: You see fewer personalized event recommendations. You will still see all available events, promotions, and announcements — they just will not be tailored to your interests.',
        ],
      },
    ],
  },
  {
    id: 'updates',
    number: 7,
    title: 'Updates to This Policy',
    body: [
      {
        type: 'paragraph',
        text: 'We may update this Cookie Policy when we add new services, change third-party providers, or modify how we use cookies. The same update mechanism described in Section 11 of our Terms of Service applies — the "Last Updated" date reflects the most recent revision.',
      },
      {
        type: 'paragraph',
        text: 'If we add new non-essential cookies, we will re-prompt your consent. Changes to essential cookies required for security or payment processing will be announced via email or a prominent notice.',
      },
    ],
  },
  {
    id: 'contact',
    number: 8,
    title: 'Contact Us',
    body: [
      {
        type: 'paragraph',
        text: 'If you have questions about our use of cookies or this Cookie Policy, contact us using the channels below.',
      },
      {
        type: 'list',
        items: [
          'Privacy email: privacy@eventticket.id',
          'Help Center: /help',
          'Support Ticket: /help/contact',
        ],
      },
      {
        type: 'paragraph',
        text: 'For broader data privacy questions, please refer to our Privacy Policy at /privacy.',
      },
    ],
  },
];
