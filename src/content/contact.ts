// Contact page content: the three topics, the progressive notes beside the
// form, the confirmation lines and the `?intent=` values that preselect a
// topic (the closing phrases and project links use them). Words only; the
// flow lives in src/app/contact.
export const CONTACT_TOPICS = [
  { id: 'General', label: 'Hello', description: 'Networking & conversation' },
  { id: 'Hiring', label: 'Work', description: 'Roles & opportunities' },
  { id: 'VC / Startup', label: 'Ideas', description: 'Projects & collaborations' },
] as const

export const CONVERSATION_NOTES: Record<string, readonly [string, string][]> = {
  Hiring: [
    ['A role worth\ntalking about.', 'Good work starts with a conversation.'],
    ['The role.\nThe real context.', 'Tell me about the team and the challenge.'],
    ['A new connection.\nA useful next step.', ''],
  ],
  'VC / Startup': [
    ['“What if we\ntried this?”', 'No pitch deck required.'],
    ['One idea.\nA starting point.', 'What problem would you like to explore?'],
    ['From an idea\nto a conversation.', ''],
  ],
  General: [
    ['One small\nhello.', 'A good conversation can start anywhere.'],
    ['No perfect opener.\nJust be yourself.', 'Say what brought you here.'],
    ['Good to\nconnect.', ''],
  ],
}

export const CONVERSATION_CONFIRMATION = {
  book: 'Your intro is reserved. See you soon.',
  email: 'Your message is with me. Thank you.',
}

// Compact companions to the same three stages, sized for the existing phone header.
export const MOBILE_CONVERSATION_NOTES: Record<string, readonly [string, string, string]> = {
  General: ['One small hello.', 'No perfect opener needed.', 'Good to connect.'],
  Hiring: ['A role worth talking about.', 'The role. The real context.', 'A useful next step.'],
  'VC / Startup': ['“What if we tried this?”', 'One idea. A starting point.', 'From idea to conversation.'],
}

// Contact page `?intent=` values and the topic each preselects.
export const INTENT_TOPIC_MAP: Record<string, string> = {
  'ai-delivers': 'VC / Startup',
  'smart-systems': 'VC / Startup',
  'data-growth': 'VC / Startup',
  'scalable-tech': 'VC / Startup',
  'practical-ai': 'VC / Startup',
  'data-backed-decisions': 'VC / Startup',
  'useful-automation': 'VC / Startup',
  'retention-signals': 'VC / Startup',
  'ai-growth-strategy': 'VC / Startup',
  'product-ideas': 'VC / Startup',
  'business-innovation': 'VC / Startup',
  'business-tech-translator': 'General',
  'automation-playbook': 'VC / Startup',
  'products-matter': 'VC / Startup',
  'real-problems': 'VC / Startup',
  'strategic-innovation': 'VC / Startup',
  'trusted-partner': 'VC / Startup',
  'first-version': 'VC / Startup',
  'project': 'VC / Startup',
  'case-study': 'VC / Startup',
  'consulting': 'VC / Startup',
  'startup': 'VC / Startup',
  'vc-startup': 'VC / Startup',
  'partnership': 'VC / Startup',
  'hiring': 'Hiring',
  'recruitment': 'Hiring',
  'general': 'General',
}
