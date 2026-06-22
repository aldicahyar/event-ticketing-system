export interface AccessibilitySection {
  id: string;
  number: number;
  title: string;
  body: AccessibilityBlock[];
}

export type AccessibilityBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] };

export const ACCESSIBILITY_META = {
  lastUpdated: 'June 21, 2026',
  effectiveDate: 'June 21, 2026',
};

export const ACCESSIBILITY_SECTIONS: AccessibilitySection[] = [
  {
    id: 'commitment',
    number: 1,
    title: 'Our Commitment',
    body: [
      {
        type: 'paragraph',
        text: 'EventTicket is committed to making our platform accessible to everyone, including people with disabilities. We believe that live events should be enjoyed by all, and that commitment extends to the digital experience of discovering, purchasing, and managing tickets.',
      },
      {
        type: 'paragraph',
        text: 'We continuously work to improve the accessibility of our website and applications based on user feedback, evolving standards, and ongoing audits. This statement describes the current state of our accessibility efforts and how you can reach us if you encounter barriers.',
      },
    ],
  },
  {
    id: 'standards',
    number: 2,
    title: 'Standards We Follow',
    body: [
      {
        type: 'paragraph',
        text: 'Our platform is designed to meet the following accessibility standards:',
      },
      {
        type: 'list',
        items: [
          'Web Content Accessibility Guidelines (WCAG) 2.1 Level AA — the international standard for web accessibility published by the W3C.',
          'Indonesian Government Regulation on Accessibility of Electronic Information and Systems — applicable regulations for digital services operating in Indonesia.',
          'Section 508 of the U.S. Rehabilitation Act — referenced as a best practice baseline for federal-level compliance.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We conduct regular internal audits and manual testing using assistive technologies to identify and remediate accessibility barriers. Our goal is not just compliance, but genuine usability for all.',
      },
    ],
  },
  {
    id: 'features',
    number: 3,
    title: 'Accessibility Features',
    body: [
      {
        type: 'paragraph',
        text: 'We have implemented the following features to make our platform more accessible:',
      },
      {
        type: 'heading',
        text: 'Navigation & Structure',
      },
      {
        type: 'list',
        items: [
          'Semantic HTML landmarks (header, nav, main, footer) for screen reader navigation.',
          'Skip to main content link — press Tab on any page to jump directly to content.',
          'Logical heading hierarchy (h1 through h6) for structured navigation.',
          'Consistent navigation patterns across all pages.',
        ],
      },
      {
        type: 'heading',
        text: 'Visual & Motor',
      },
      {
        type: 'list',
        items: [
          'Visible focus indicators on all interactive elements (outline + offset).',
          'Minimum touch target size of 44x44 pixels on all buttons and links.',
          'High contrast color scheme (black background, white text) meeting WCAG AA ratios.',
          'Text resizing support up to 200% without loss of content or functionality.',
          'No reliance on color alone to convey information — text labels accompany status indicators.',
        ],
      },
      {
        type: 'heading',
        text: 'Forms & Input',
      },
      {
        type: 'list',
        items: [
          'All form inputs have associated label elements with explicit programmatic linkage.',
          'Autocomplete attributes on all relevant fields (name, email, tel, etc.) for browser autofill.',
          'Input font size of 16px to prevent iOS zoom-on-focus behavior.',
          'Inline error messages with role="alert" and field-level aria-describedby linking.',
          'Error focus management — first error field receives focus on submission failure.',
        ],
      },
      {
        type: 'heading',
        text: 'Motion & Media',
      },
      {
        type: 'list',
        items: [
          'Respect for prefers-reduced-motion — animations are disabled or simplified when this setting is active.',
          'All images include descriptive alt text or are marked as decorative with aria-hidden.',
          'Video and audio content includes captions or transcripts where available.',
        ],
      },
    ],
  },
  {
    id: 'compatibility',
    number: 4,
    title: 'Assistive Technology Compatibility',
    body: [
      {
        type: 'paragraph',
        text: 'We test our platform with the following assistive technologies to ensure compatibility:',
      },
      {
        type: 'list',
        items: [
          'Screen readers: NVDA (Windows), VoiceOver (macOS and iOS), TalkBack (Android).',
          'Browser-based accessibility tools: Windows High Contrast Mode, browser zoom up to 200%.',
          'Keyboard-only navigation — all functionality is accessible without a pointing device.',
          'Switch control and voice control software on mobile platforms.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We primarily test on the latest versions of Chrome, Firefox, Safari, and Edge. If you use a different browser or assistive technology and encounter issues, please let us know.',
      },
    ],
  },
  {
    id: 'limitations',
    number: 5,
    title: 'Known Limitations',
    body: [
      {
        type: 'paragraph',
        text: 'Despite our ongoing efforts, some areas of the platform may still present barriers:',
      },
      {
        type: 'list',
        items: [
          'Interactive map placeholders on venue pages are not yet fully accessible to screen readers. Full coordinates and address text are provided as alternatives while we work on map integration.',
          'Third-party embedded content (social media widgets, payment provider flows) may not fully conform to our accessibility standards. We actively work with these providers to improve.',
          'Some legacy help articles may contain formatting that is not fully optimized for screen readers. We are in the process of migrating content to accessible formats.',
        ],
      },
      {
        type: 'paragraph',
        text: 'If you encounter a barrier not listed here, please report it using the contact details in Section 7. We prioritize remediation based on user impact.',
      },
    ],
  },
  {
    id: 'third-party',
    number: 6,
    title: 'Third-Party Content & Venues',
    body: [
      {
        type: 'paragraph',
        text: 'While we strive to ensure accessibility across our entire platform, some content is provided by third parties:',
      },
      {
        type: 'list',
        items: [
          'Venue accessibility information (wheelchair access, accessible seating, parking) is provided by each Venue and Event Organizer. We display this information as supplied but cannot guarantee its accuracy.',
          'Payment processing flows are operated by certified third-party providers (banks, payment gateways) and are subject to their own accessibility standards.',
          'Event images and promotional materials are submitted by Event Organizers. We encourage organizers to provide alt text but cannot enforce this on user-uploaded content.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We are committed to working with our partners to improve the accessibility of all content delivered through our platform.',
      },
    ],
  },
  {
    id: 'feedback',
    number: 7,
    title: 'Feedback & Reporting Issues',
    body: [
      {
        type: 'paragraph',
        text: 'Your feedback is essential to helping us improve. If you encounter an accessibility barrier, have difficulty completing a task, or have suggestions for improvement, please contact us:',
      },
      {
        type: 'list',
        items: [
          'Submit a support ticket: /help/contact (select "Accessibility" as the category)',
          'Email our accessibility team: accessibility@eventticket.id',
          'General help center: /help',
        ],
      },
      {
        type: 'paragraph',
        text: 'When reporting an issue, please include: the page URL, the assistive technology you are using, a description of the problem, and the expected behavior. We aim to respond within 2 business days and provide a remediation timeline where applicable.',
      },
      {
        type: 'paragraph',
        text: 'If you need assistance completing a ticket purchase and cannot use our standard checkout flow, contact us immediately — we will arrange an alternative purchase method to ensure you do not miss out on your event.',
      },
    ],
  },
];
