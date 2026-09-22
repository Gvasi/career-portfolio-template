// Home page content: the greeting, the code stories the terminal types, the
// How I work chapters with their side copy, and the closing phrases. Words
// only; the components own layout, timing and interaction.

// The greeting sentence is split so the rotating outcome word can animate on its own.
export const hero = {
  /** Text before the highlighted first name. */
  greetingPrefix: 'Hi, I’m ',
  /** First line of the value sentence; the second line ends with the story's outcome word. */
  valueLine: 'I use data, analysis and automation',
  valueLead: 'to create ',
  /** Second line of the hero meta row, beside the location. */
  secondaryMeta: 'Working remotely',
} as const

// Each story carries the hero outcome it pairs with, so the terminal tab and
// the outcome text in the greeting can never drift apart. Keep lines short:
// the terminal reserves the width of the widest story.
export const codeStories = [
  {
    title: 'Business',
    file: 'business.py',
    language: 'Python',
    outcome: 'better decisions.',
    lines: ['# Useful beats impressive.', 'if idea.shiny and not pays_rent():', '    pass  # respectfully', 'ship("useful next step this week")'],
  },
  {
    title: 'Data',
    file: 'signal.sql',
    language: 'SQL',
    outcome: 'clearer insights.',
    lines: ['SELECT decision, owner, next_step', 'FROM dashboards_we_actually_use', 'WHERE meeting_got_shorter = true', 'LIMIT 3;'],
  },
  {
    title: 'AI',
    file: 'ai.py',
    language: 'Python',
    outcome: 'cleaner workflows.',
    lines: ['ai.explores(possibilities)', 'ai.helps(build, automate)', 'me.checks(what_actually_works)', 'ship("time for the interesting bit")'],
  },
  {
    title: 'Product',
    file: 'product.py',
    language: 'Python',
    outcome: 'clearer decisions.',
    lines: ['# Users taught me context.', 'users != rows_in_a_report', 'read(feedback, funnels, numbers)', 'decide("with more than a hunch")'],
  },
  {
    title: 'Bridge',
    file: 'translator.ts',
    language: 'TypeScript',
    outcome: 'shared clarity.',
    lines: ['listen(business, tech, people)', 'translate("what each side needs")', 'agree(owner, outcome, next_step)', 'ship("fewer crossed wires")'],
  },
] as const

export type Story = typeof codeStories[number]

// The six How I work chapters (tab titles, taglines, copy items) and the side
// copy shown beside each: a two-line quote and a question with its answer.
// The `id` keys select the chapter animation in public/animations/how-i-work.
export const HOW_I_WORK_SECTIONS = [
  {
    id: 'translator',
    title: 'Translate',
    tagline: 'One request. Different expectations. I help us agree what’s needed.',
    items: ['One request. Different expectations.', 'I help us agree what’s needed.'],
  },
  {
    id: 'ownership',
    title: 'Value',
    tagline: 'A promising idea hits the room. I check the problem it solves.',
    items: ['A promising idea hits the room.', 'I check the problem it solves.'],
  },
  {
    id: 'clarity',
    title: 'AI',
    tagline: 'The same task comes round again. I find a way to cut the repeat work.',
    items: ['The same task comes round again.', 'I find a way to cut the repeat work.'],
  },
  {
    id: 'systems',
    title: 'Data',
    tagline: 'Two reports tell different stories. I check what’s behind the numbers.',
    items: ['Two reports tell different stories.', 'I check what’s behind the numbers.'],
  },
  {
    id: 'growth',
    title: 'Systems',
    tagline: 'People avoid tools for a reason. I find what the system makes hard.',
    items: ['People avoid tools for a reason.', 'I find what the system makes hard.'],
  },
  {
    id: 'value',
    title: 'Momentum',
    tagline: 'The plan starts feeling too big. I find a smaller place to start.',
    items: ['The plan starts feeling too big.', 'I find a smaller place to start.'],
  },
] as const

export type HowIWorkSection = (typeof HOW_I_WORK_SECTIONS)[number]

export const HOW_I_WORK_SIDE_COPY: Record<HowIWorkSection['id'], { quoteLines: [string, string]; faqQ: string; faqA: string }> = {
  translator: {
    quoteLines: ['Good work starts when everyone', 'means the same thing by done.'],
    faqQ: 'So, what happens next?',
    faqA: 'Owner, outcome, date. Then we move.',
  },
  ownership: {
    quoteLines: ['Good ideas deserve a chance.', 'A clear reason helps them get one.'],
    faqQ: 'What makes it worth doing?',
    faqA: 'Time saved, less friction, better work.',
  },
  clarity: {
    quoteLines: ['A little setup now.', 'Less busywork every day.'],
    faqQ: 'Which AI tool would you use?',
    faqA: 'I compare them on the actual task.',
  },
  systems: {
    quoteLines: ['Data should lower the volume', 'and sharpen the decision.'],
    faqQ: 'Which number do we trust?',
    faqA: 'Check the source and what it counts.',
  },
  growth: {
    quoteLines: ['If people work around the tool,', 'the tool is part of the problem.'],
    faqQ: 'What makes a new tool stick?',
    faqA: 'People see how it helps their work.',
  },
  value: {
    quoteLines: ['A first version gives us', 'something real to learn from.'],
    faqQ: 'Where do we even start?',
    faqA: 'One problem. One version. Try it.',
  },
}

// The closing call to action cycles through these phrase sets. Each secondary
// phrase carries a key that becomes the contact page's `?intent=` value.
export interface PhraseSet {
  primary: string
  secondary: { t: string; k: string }[]
}

export const closingPhrases: PhraseSet[] = [
  {
    primary: 'Idea worth trying?', secondary: [
      { t: "Let's build the first version.", k: 'first-version' },
      { t: "Let's see where it could go.", k: 'explore-idea' },
      { t: "Let's find a place to start.", k: 'place-to-start' },
      { t: 'Rough ideas welcome.', k: 'rough-ideas' },
    ],
  },
  {
    primary: 'Problem worth solving?', secondary: [
      { t: "Let's untangle it.", k: 'untangle' },
      { t: 'Talk me through it.', k: 'talk-through' },
      { t: "Let's look at the options.", k: 'look-at-options' },
      { t: "Let's find a way forward.", k: 'way-forward' },
    ],
  },
  {
    primary: 'Just want to connect?', secondary: [
      { t: "Let's compare notes.", k: 'compare-notes' },
      { t: "Tell me what you're into.", k: 'your-interests' },
      { t: 'No pitch deck needed.', k: 'no-pitch-needed' },
      { t: 'A hello is a good start.', k: 'say-hello' },
    ],
  },
]
