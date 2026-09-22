// About page content: the career chapters, the credentials, the intro and the
// sign-off. Example records for a fictional person; replace every entry with
// your own (docs/customisation.md). Components own the layout and motion.

export interface Milestone {
  id: string
  year: string
  dateRange: string
  role: string
  company: string
  location: string
  description: string
  highlights?: string[]
  mobileHighlights?: string[]
  /** 1280 px wide illustration under public/images/career (landscape, about 3:2). */
  image?: string
  /** CSS object-position for the crop, when the subject is off-centre. */
  imagePosition?: string
  type: 'work' | 'education'
}

export const milestones: Milestone[] = [
  {
    id: 'product-analyst-2025',
    year: '2025',
    dateRange: 'Mar 2025 – Present',
    role: 'Product Analyst',
    company: 'Northwind Studio',
    location: 'Lisbon, Portugal',
    description: 'I work with the product team on what to build next: which features people use, where they drop off, and which of our ideas the numbers actually support. When a question comes back every week, I turn it into a report that answers itself.',
    highlights: ['Product Analytics', 'Experiment Design', 'Automation', 'Roadmap Input'],
    mobileHighlights: ['Product Data', 'Experiments', 'Automation', 'Roadmap'],
    image: '/images/career/product-development.webp',
    type: 'work',
  },
  {
    id: 'data-analyst-2023',
    year: '2023',
    dateRange: 'Jun 2023 – Mar 2025',
    role: 'Data Analyst',
    company: 'Northwind Studio',
    location: 'Lisbon, Portugal',
    description: 'I moved from operations into a software team and learned to connect what a dashboard shows with what the business needs to decide. SQL, Python and Power BI became everyday tools; explaining a number to someone who has to act on it became the real job.',
    highlights: ['SQL & Modelling', 'Dashboards', 'Business Context', 'Data Quality'],
    mobileHighlights: ['SQL', 'Dashboards', 'Business Fit', 'Data Quality'],
    image: '/images/career/analytics.webp',
    type: 'work',
  },
  {
    id: 'university',
    year: '2022',
    dateRange: 'Sep 2022 – Present',
    role: 'BBA Student (part-time)',
    company: 'Example University',
    location: 'Lisbon, Portugal',
    description: 'A part-time business degree alongside work. Finance, strategy and management classes give names to things I had already run into, and help me see how a decision in one team lands in another.',
    highlights: ['Business Strategy', 'Management', 'Finance', 'Marketing'],
    mobileHighlights: ['Strategy', 'Management', 'Finance', 'Marketing'],
    image: '/images/career/learning.webp',
    type: 'education',
  },
  {
    id: 'operations-analyst-2021',
    year: '2021',
    dateRange: 'Feb 2021 – Jun 2023',
    role: 'Operations Analyst',
    company: 'Harbourline Logistics',
    location: 'Porto, Portugal',
    description: 'Weekly reporting for a busy operations floor: late deliveries, capacity, staffing. I replaced a stack of spreadsheets with a small set of reports people actually opened, and learned that the best report is the one that ends an argument.',
    highlights: ['Operational Reporting', 'Process Improvement', 'Spreadsheets to Scripts', 'Stakeholders'],
    mobileHighlights: ['Reporting', 'Process', 'Scripts', 'Stakeholders'],
    image: '/images/career/operations.webp',
    type: 'work',
  },
  {
    id: 'support-2019',
    year: '2019',
    dateRange: '2019 – 2021',
    role: 'Customer Support, then Operations',
    company: 'Harbourline Logistics',
    location: 'Porto, Portugal',
    description: 'I started on the support desk, learning the customers, the exceptions and the pace of the work. Curiosity about why the same problems kept coming back led to my first analysis, and then to the operations team.',
    highlights: ['Customer Support', 'Root Causes', 'First Analyses', 'Operations'],
    mobileHighlights: ['Support', 'Root Causes', 'Analyses', 'Operations'],
    image: '/images/career/support.webp',
    type: 'work',
  },
]

export type CredentialIssuerMarkKind = 'logo' | 'text'

export interface Credential {
  /** Fictional records show a sample label instead of a verification link. Remove for your own credentials. */
  example?: boolean
  id: string
  type: 'certificate' | 'degree'
  title: string
  /** Two short lines for the phone wallet card. */
  shortTitle: readonly [string, string]
  /** Compact heading for the phone wallet detail view. */
  detailTitle: string
  /** Optional abbreviation shown after the detail heading (for example "BBA"). */
  abbreviation?: string
  issuer: string
  issuerDisplay: string
  /** `text` renders the issuer name; `logo` renders `issuerLogoSrc` (use only marks you may reproduce). */
  issuerMarkKind: CredentialIssuerMarkKind
  issuerLogoSrc?: string
  issuerLogoAlt?: string
  year: string
  /** Each skill needs an entry in `credentialFocus.ts` for its icon and short detail. */
  skills: string[]
  status: 'completed' | 'in-progress'
  verifyUrl?: string
  summary?: string
}

export const credentials: Credential[] = [
  {
    id: 'data-analytics-certificate',
    type: 'certificate',
    title: 'Data Analytics Certificate',
    shortTitle: ['Data', 'Analytics'],
    detailTitle: 'Data Analytics',
    issuer: 'Example Academy',
    issuerDisplay: 'Example Academy',
    issuerMarkKind: 'text',
    year: '2024',
    skills: ['Business Questions', 'Data Quality', 'Analysis', 'Clear Findings'],
    summary: 'Turning a business question into clear findings: prepare the data, understand it, and explain what matters to the person who has to decide.',
    status: 'completed',
    example: true,
  },
  {
    id: 'project-management-certificate',
    type: 'certificate',
    title: 'Project Management Certificate',
    shortTitle: ['Project', 'Management'],
    detailTitle: 'Project Management',
    issuer: 'Example Academy',
    issuerDisplay: 'Example Academy',
    issuerMarkKind: 'text',
    year: '2024',
    skills: ['Planning', 'Stakeholders', 'Risks', 'Agile'],
    summary: 'Planning work, keeping people involved and managing risks, with Agile and Scrum for adapting as a project evolves. A project needs more than a tidy task list.',
    status: 'completed',
    example: true,
  },
  {
    id: 'business-degree',
    example: true,
    type: 'degree',
    title: 'Bachelor of Business Administration',
    shortTitle: ['Business', 'Degree'],
    detailTitle: 'Business Administration',
    abbreviation: 'BBA',
    issuer: 'Example University',
    issuerDisplay: 'Example University',
    issuerMarkKind: 'text',
    year: '2022–Present',
    skills: ['Business Strategy', 'Management', 'Finance', 'Marketing'],
    summary: 'How a business chooses its priorities, supports its people, uses its resources and reaches its customers. It helps me connect a technical idea to the wider decision.',
    status: 'in-progress',
  },
]

export interface AboutIntroContent {
  eyebrow: string
  headlineStatic: string
  headlineKeywords: string[]
  dek: string
  trustPills: { icon: 'pin' | 'globe'; label: string }[]
  jumpLinks: { label: string; href: string }[]
  profileFacts: { label: string; value: string }[]
  portraitSrc: string
  portraitAlt: string
}

export const aboutIntro: AboutIntroContent = {
  eyebrow: 'About Alex',
  headlineStatic: 'People bring me questions. I help find the answer that moves things.',
  headlineKeywords: ['clarity', 'growth', 'momentum'],
  dek: 'I’m Alex, a Product Analyst at Northwind Studio in Lisbon. My background in operations brought me close to the customers, the exceptions and the decisions behind the work. Today I bring that perspective to product data, automation and useful first versions.',
  trustPills: [
    { icon: 'pin', label: 'Lisbon, Portugal' },
    { icon: 'globe', label: 'Working remotely' },
  ],
  jumpLinks: [
    { label: 'Career proof', href: '#career-journey' },
    { label: 'Credentials', href: '#credentials' },
  ],
  profileFacts: [
    { label: 'Position', value: 'Product Analyst' },
    { label: 'Focus', value: 'Product data, automation' },
    { label: 'Base', value: 'Lisbon, Portugal' },
    { label: 'Since', value: '2019' },
  ],
  portraitSrc: '/images/profile/about-portrait.webp',
  portraitAlt: 'Alex Example, illustrated portrait',
}

/** Heading of the career journey; the component adds the closing full stop. */
export const journeyHeading = {
  title: 'How I got here',
  subhead: 'From a support desk in Porto to product analytics in Lisbon.',
}

/** The sign-off invitation: `headlineLead` + the underlined `signatureWord` + a full stop. */
export const aboutCta = {
  headlineLead: 'Let’s compare',
  signatureWord: 'notes',
  subtext: 'A role, an idea, or something you’re figuring out? If you think we’d have a good conversation, I’d like to hear from you.',
  buttonText: 'Let’s connect',
  buttonHref: '/contact',
}
