export interface Position {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full-time' | 'contract' | 'internship';
  description: string;
  requirements: string[];
  responsibilities: string[];
  // --- Backend-ready mockup fields ---
  salaryMin: number;
  salaryMax: number;
  currency: string;
  postedDate: string;
  applicationDeadline: string;
  team: string;
  reportsTo: string;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'lead';
  techStack?: string[];
  niceToHaves?: string[];
}

export interface Benefit {
  icon: string;
  title: string;
  description: string;
}

export interface CultureValue {
  icon: string;
  title: string;
  description: string;
}

export const CAREERS_BENEFITS: Benefit[] = [
  {
    icon: 'Rocket',
    title: 'Career Growth',
    description: 'Clear progression paths and mentorship programs to accelerate your professional development.',
  },
  {
    icon: 'Globe',
    title: 'Remote Flexibility',
    description: 'Work from anywhere in Indonesia. We trust you to deliver results, not clock hours.',
  },
  {
    icon: 'Zap',
    title: 'Fast-Paced Environment',
    description: 'No bureaucracy. Your ideas ship quickly and impact thousands of users immediately.',
  },
  {
    icon: 'Heart',
    title: 'Health & Wellness',
    description: 'Comprehensive health insurance, mental health support, and annual wellness allowance.',
  },
  {
    icon: 'Ticket',
    title: 'Event Access',
    description: 'Free tickets to partner events and exclusive backstage passes for major tours.',
  },
  {
    icon: 'Users',
    title: 'Team Culture',
    description: 'Small, passionate team that values collaboration, transparency, and brutal honesty.',
  },
];

export const CAREERS_CULTURE: CultureValue[] = [
  {
    icon: 'Shield',
    title: 'Trust & Autonomy',
    description: 'We hire smart people and get out of their way. No micromanagement, just ownership.',
  },
  {
    icon: 'Zap',
    title: 'Ship Fast',
    description: 'Move fast, break things (safely), iterate. Perfect is the enemy of shipped.',
  },
  {
    icon: 'Heart',
    title: 'User Obsessed',
    description: 'Every decision starts with: does this make the fan experience better?',
  },
  {
    icon: 'Award',
    title: 'Excellence',
    description: 'We hold ourselves to high standards. Good enough is never good enough.',
  },
];

export const OPEN_POSITIONS: Position[] = [
  {
    id: 'pos-1',
    title: 'Senior Backend Engineer',
    department: 'Engineering',
    location: 'Jakarta / Remote',
    type: 'full-time',
    description:
      'Build and scale the core ticketing engine that handles thousands of concurrent transactions during high-demand event sales.',
    requirements: [
      '5+ years experience with Node.js / TypeScript',
      'Experience with PostgreSQL, Redis, and message queues',
      'Understanding of distributed systems and microservices',
      'Experience with payment gateway integrations (Stripe, Midtrans)',
    ],
    responsibilities: [
      'Design and implement high-throughput API endpoints',
      'Optimize database queries for sub-100ms response times',
      'Build real-time seat locking and inventory management systems',
      'Mentor junior engineers and conduct code reviews',
    ],
    salaryMin: 25000000,
    salaryMax: 40000000,
    currency: 'IDR',
    postedDate: '2025-05-15',
    applicationDeadline: '2025-07-30',
    team: 'Core Platform',
    reportsTo: 'VP of Engineering',
    experienceLevel: 'senior',
    techStack: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes'],
    niceToHaves: [
      'Experience with event-driven architecture',
      'Contributions to open-source projects',
      'Experience with high-concurrency e-commerce systems',
    ],
  },
  {
    id: 'pos-2',
    title: 'Frontend Developer',
    department: 'Engineering',
    location: 'Jakarta / Remote',
    type: 'full-time',
    description:
      'Create blazing-fast, accessible user interfaces for the next generation of event ticketing.',
    requirements: [
      '3+ years experience with React / Next.js',
      'Strong TypeScript skills',
      'Experience with Tailwind CSS and component libraries',
      'Understanding of web performance optimization',
    ],
    responsibilities: [
      'Build responsive, accessible UI components',
      'Implement complex interactive features (seat maps, real-time updates)',
      'Optimize Core Web Vitals for all pages',
      'Collaborate with designers on design system improvements',
    ],
    salaryMin: 15000000,
    salaryMax: 28000000,
    currency: 'IDR',
    postedDate: '2025-05-20',
    applicationDeadline: '2025-08-15',
    team: 'Web Application',
    reportsTo: 'Engineering Manager',
    experienceLevel: 'mid',
    techStack: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand'],
    niceToHaves: [
      'Experience with Server Components / RSC',
      'Familiarity with design systems (Radix, shadcn/ui)',
      'Accessibility (WCAG 2.1) expertise',
    ],
  },
  {
    id: 'pos-3',
    title: 'DevOps Engineer',
    department: 'Infrastructure',
    location: 'Jakarta / Remote',
    type: 'full-time',
    description:
      'Ensure our platform stays up during the biggest event sales of the year. Build infrastructure that scales automatically.',
    requirements: [
      '4+ years experience with AWS or GCP',
      'Strong knowledge of Docker and Kubernetes',
      'Experience with CI/CD pipelines (GitHub Actions, GitLab CI)',
      'Monitoring and observability tools (Datadog, Grafana)',
    ],
    responsibilities: [
      'Manage and optimize cloud infrastructure',
      'Build auto-scaling systems for traffic spikes',
      'Implement security best practices and compliance',
      'Reduce infrastructure costs while improving reliability',
    ],
    salaryMin: 22000000,
    salaryMax: 35000000,
    currency: 'IDR',
    postedDate: '2025-05-10',
    applicationDeadline: '2025-07-15',
    team: 'Site Reliability',
    reportsTo: 'Head of Infrastructure',
    experienceLevel: 'senior',
    techStack: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'GitHub Actions', 'Grafana', 'Prometheus'],
    niceToHaves: [
      'AWS Solutions Architect certification',
      'Experience with multi-region deployments',
      'Knowledge of FinOps practices',
    ],
  },
  {
    id: 'pos-4',
    title: 'Product Designer',
    department: 'Design',
    location: 'Jakarta / Remote',
    type: 'full-time',
    description:
      'Design the end-to-end experience for fans buying tickets and organizers managing events.',
    requirements: [
      '4+ years product design experience',
      'Proficiency in Figma and design systems',
      'Experience with user research and usability testing',
      'Portfolio demonstrating complex product design work',
    ],
    responsibilities: [
      'Lead design for key product features',
      'Conduct user research and usability studies',
      'Maintain and evolve the design system',
      'Collaborate closely with engineering on implementation',
    ],
    salaryMin: 18000000,
    salaryMax: 30000000,
    currency: 'IDR',
    postedDate: '2025-05-18',
    applicationDeadline: '2025-08-01',
    team: 'Product Design',
    reportsTo: 'Head of Design',
    experienceLevel: 'senior',
    techStack: ['Figma', 'FigJam', 'Maze', 'Hotjar', 'Lottie'],
    niceToHaves: [
      'Motion design / micro-interaction skills',
      'Experience with design tokens and automated pipelines',
      'Background in entertainment or ticketing industry',
    ],
  },
  {
    id: 'pos-5',
    title: 'Partnership Manager',
    department: 'Business Development',
    location: 'Jakarta',
    type: 'full-time',
    description:
      'Build and maintain relationships with event organizers, venues, and artists to bring more events to our platform.',
    requirements: [
      '3+ years in business development or partnerships',
      'Strong network in the entertainment/music industry',
      'Excellent negotiation and communication skills',
      'Experience with CRM tools and partnership tracking',
    ],
    responsibilities: [
      'Identify and close partnership opportunities',
      'Manage relationships with key event organizers',
      'Negotiate revenue-sharing agreements',
      'Represent EventTicket at industry events and conferences',
    ],
    salaryMin: 16000000,
    salaryMax: 28000000,
    currency: 'IDR',
    postedDate: '2025-05-22',
    applicationDeadline: '2025-08-20',
    team: 'Growth',
    reportsTo: 'Head of Business Development',
    experienceLevel: 'mid',
    techStack: ['HubSpot', 'Notion', 'Looker', 'Google Workspace'],
    niceToHaves: [
      'Existing relationships with major Indonesian promoters',
      'Experience with B2B SaaS partnerships',
      'Bilingual (Indonesian / English)',
    ],
  },
  {
    id: 'pos-6',
    title: 'Engineering Intern',
    department: 'Engineering',
    location: 'Jakarta / Remote',
    type: 'internship',
    description:
      'Kickstart your career in tech. Work on real features that impact thousands of users from day one.',
    requirements: [
      'Currently pursuing or recently completed CS degree',
      'Basic knowledge of JavaScript/TypeScript',
      'Eagerness to learn and take initiative',
      'Available for 3-6 month commitment',
    ],
    responsibilities: [
      'Work on well-defined features with mentor guidance',
      'Participate in code reviews and team standups',
      'Contribute to internal tools and documentation',
      'Present your work at end-of-internship demo day',
    ],
    salaryMin: 5000000,
    salaryMax: 8000000,
    currency: 'IDR',
    postedDate: '2025-05-25',
    applicationDeadline: '2025-08-30',
    team: 'Various',
    reportsTo: 'Engineering Manager',
    experienceLevel: 'junior',
    techStack: ['React', 'Node.js', 'TypeScript', 'Git'],
    niceToHaves: [
      'Side projects or GitHub contributions',
      'Familiarity with any modern framework',
      'Open source contributions',
    ],
  },
];

export const DEPARTMENTS = ['All', 'Engineering', 'Design', 'Infrastructure', 'Business Development'];

export const POSITION_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full Time',
  'contract': 'Contract',
  'internship': 'Internship',
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid-Level',
  senior: 'Senior',
  lead: 'Lead',
};

export function getPositionById(id: string): Position | undefined {
  return OPEN_POSITIONS.find((p) => p.id === id);
}

export function formatSalary(min: number, max: number, currency: string): string {
  const fmt = (n: number) => {
    if (currency === 'IDR') {
      return `${(n / 1000000).toFixed(0)}M`;
    }
    return new Intl.NumberFormat('en-US').format(n);
  };
  return `${fmt(min)} \u2013 ${fmt(max)} ${currency === 'IDR' ? '/mo' : ''}`.trim();
}

export function getRelatedPositions(currentId: string, limit = 3): Position[] {
  const current = getPositionById(currentId);
  if (!current) return [];
  return OPEN_POSITIONS.filter(
    (p) => p.id !== currentId && (p.department === current.department || p.type === current.type),
  ).slice(0, limit);
}
