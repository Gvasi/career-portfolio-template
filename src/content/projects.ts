// The project reel: three example projects for a fictional person, each with
// the story its dialog tells. Replace them with yours (docs/customisation.md);
// the components (Projects, ProjectArtwork, ProjectViewer) render whatever is
// here and derive the analytics allowlist from the ids.
import type { ProjectCardData, ProjectStory } from '@/components/sections/Projects/projectTypes'

const STORIES: Record<string, ProjectStory> = {
  'this-portfolio': {
    intro: 'Meet the person behind the CV.',
    summary: 'My portfolio brings together interactive stories, work in progress and direct ways to start a conversation.',
    map: { label: 'Explore the experience', kind: 'journey', parts: [
      { label: 'Stories', icon: 'stories', title: 'Get a feel for how I think.', detail: 'Explore my approach to curiosity, AI and working with people. The career story adds the experience behind those ideas.' },
      { label: 'Messages', icon: 'message', title: 'Start with what’s on your mind.', detail: 'Choose a conversation topic and send me a message from the contact page. No meeting needed.' },
      { label: 'Meetings', icon: 'meeting', title: 'Turn a hello into a conversation.', detail: 'When booking is switched on, find an available time and book a call from the site. The invitation gives us a place to pick things up.' },
    ] },
    learning: { label: 'What I’m learning', title: 'The small details decide how it feels.', body: 'A good interaction works with a thumb, a keyboard and reduced motion. All three deserve the same care.' },
    subtitle: 'Behind the digital handshake',
    next: 'Keep testing the path from exploring the site to starting a conversation.',
    decisions: [
      { label: 'Stories', question: 'Why interactive stories?', title: 'Let you explore my thinking.', body: 'Stories and a little humour let you meet the person behind the job title.', takeaway: 'Extra build and testing work. Every interaction needs to say something useful.' },
      { label: 'Booking', question: 'Why booking here?', title: 'Put booking inside the site.', body: 'Booking stays close to the introduction, with a message option if you prefer.', takeaway: 'Fewer steps for a visitor; calendar integration and maintenance for me.' },
      { label: 'Motion', question: 'Why this motion?', title: 'Make your action feel connected.', body: 'Movement shows what changed when you steer a slider or launch the next step.', takeaway: 'More motion to test, including an equally useful reduced-motion version.' },
    ],
    tools: [
      { name: 'Next.js', role: 'Pages & contact flow', detail: 'The site structure and server routes behind messages and meeting requests.', why: 'One application can handle the introduction and the server-side work behind the invitation.' },
      { name: 'TypeScript', role: 'Clearer code', detail: 'Typed components and request data help catch mistakes as the site evolves.', why: 'Clear data shapes make it easier to change the experience without breaking a connected flow.' },
      { name: 'Framer Motion', role: 'Movement & response', detail: 'The springs, transitions and tactile interactions that make the site respond to you.', why: 'Motion can explain a change of state and make an action feel connected to its result.' },
      { name: 'React', role: 'Interactive components', detail: 'Reusable components connect the interface to your selections and actions.', why: 'A shared component model keeps repeated patterns consistent as the portfolio grows.' },
      { name: 'Tailwind CSS', role: 'Responsive styling', detail: 'Layout, spacing and responsive styles across the site.', why: 'Shared styling primitives help the experience stay consistent across screen sizes.' },
      { name: 'Google Calendar', role: 'Meeting booking', detail: 'Availability checks, calendar events and Google Meet invitations, when configured.', why: 'The invitation can end with a real time to talk, directly from the site.' },
      { name: 'Gmail', role: 'Contact messages', detail: 'The email delivery behind the contact form, when configured.', why: 'A visitor can send a message even when booking a meeting is not the right next step.' },
    ],
  },
  'research-dashboard': {
    intro: 'Ask a question. See the evidence.',
    summary: 'A dashboard that turns a recurring product question into a small set of charts the team can trust.',
    map: { label: 'The workflow being built', kind: 'workflow', parts: [
      { label: 'Sources', icon: 'data', title: 'Bring the numbers together.', detail: 'Product events, support tickets and release notes are being loaded into one model so a question can be answered from one place.' },
      { label: 'Rules', icon: 'rules', title: 'Give each question a testable shape.', detail: 'Every chart states what it counts and what it leaves out, so a surprising number can be checked instead of argued about.' },
      { label: 'Activity', icon: 'activity', title: 'Follow what changed.', detail: 'A change log beside the charts shows which release or campaign lines up with a movement. The full loop is still being integrated and tested.' },
    ] },
    learning: { label: 'What I’m testing', title: 'Do the numbers tell the same story?', body: 'Product events, support volume and release timing need to agree before a chart deserves a place on the team’s wall.' },
    subtitle: 'One question. One trustworthy chart.',
    next: 'Ship one complete question: sources, definition, chart and change log.',
    decisions: [
      { label: 'Definitions', question: 'Why define first?', title: 'Write the definition before the chart.', body: 'Each metric gets a one-line definition the team agrees on before anything is plotted.', takeaway: 'Slower to start; far fewer “which number is right?” meetings later.' },
      { label: 'Visibility', question: 'Why a change log?', title: 'Keep the context in view.', body: 'Releases and campaigns sit beside the charts, giving the team possible explanations to investigate when a number changes.', takeaway: 'Timing provides context; it does not prove that a release caused the change.' },
    ],
    tools: [
      { name: 'SQL', role: 'The model', detail: 'Views that turn raw events into the few tables the dashboard reads.', why: 'A shared model keeps every chart counting the same thing.' },
      { name: 'Python', role: 'Loading & checks', detail: 'Small scripts load the sources and test the definitions before a refresh is published.', why: 'Checks that run every time catch the quiet breakages a person would miss.' },
      { name: 'PostgreSQL', role: 'Persistent data', detail: 'Stores the source records and prepared tables that feed each refresh.', why: 'A shared database keeps the history available and lets the checks and charts read the same records.' },
      { name: 'Power BI', role: 'Explore the findings', detail: 'Presents the prepared data as charts, with filters for dates and user groups.', why: 'People can investigate a question themselves, while the shared SQL definitions keep each view counting the same thing.' },
    ],
  },
  'retention-signals': {
    intro: 'Who comes back, and why?',
    summary: 'A concept for exploring retention, onboarding impact and where users quietly leave.',
    map: { label: 'Three questions to explore', kind: 'questions', parts: [
      { label: 'Retention', icon: 'retention', title: 'Who comes back — and who doesn’t?', detail: 'A planned analysis of return behaviour across comparable user groups, looking for a retention question worth investigating.' },
      { label: 'Onboarding', icon: 'promotion', title: 'What does the first week really change?', detail: 'Explore how behaviour differs after onboarding changes, while keeping alternative explanations and data limits visible.' },
      { label: 'Lost value', icon: 'value', title: 'Where do users slip away?', detail: 'Look for patterns worth investigating in activity and drop-off. These are analysis directions, with no findings claimed yet.' },
    ] },
    learning: { label: 'What I want to learn', title: 'Which question changes the next move?', body: 'I want to find where the evidence can support a practical product decision.' },
    subtitle: 'Start with a better question',
    next: 'Choose one question and build a small, shareable analysis using synthetic or publishable data.',
    decisions: [
      { label: 'Focus', question: 'Why one question?', title: 'Choose one product question.', body: 'Retention, onboarding impact and lost value are possible starting points. The first version will explore one.', takeaway: 'A narrower first analysis leaves more room to check the evidence behind a decision.' },
      { label: 'Open data', question: 'Why shareable data?', title: 'Use data I can share.', body: 'Plan around synthetic or publishable data, with assumptions visible alongside the analysis.', takeaway: 'Shareable examples have limits; those limits need to be part of the explanation.' },
    ],
    tools: [
      { name: 'SQL', role: 'Prepare the questions', detail: 'Planned for shaping cohorts, activity and onboarding data into comparable groups.', why: 'Comparable groups are a useful starting point before drawing conclusions from a chart.' },
      { name: 'Python', role: 'Explore the patterns', detail: 'Planned for checking the data and exploring the three product questions.', why: 'The analysis needs room for checks, alternative explanations and repeatable exploration.' },
      { name: 'Power BI', role: 'Make findings readable', detail: 'Planned for presenting the analysis around a decision, once there are findings to share.', why: 'A readable view should help someone decide what to investigate or change next.' },
    ],
  },
}

export const projects: ProjectCardData[] = [
  {
    id: 'this-portfolio',
    story: STORIES['this-portfolio'],
    title: 'This Portfolio',
    shortName: 'Portfolio',
    status: 'live',
    statusLabel: 'Live',
    thumbnail: '/images/projects/portfolio-preview.png',
    thumbnailAlt: 'Portfolio homepage with the greeting, portrait and code-story terminal',
    // Rendered on the laptop composition; the screenshot is the site itself.
    artwork: { kind: 'site-preview', screenshot: '/images/projects/portfolio-preview.png' },
    links: [{ url: '/', type: 'demo' }, { url: 'https://github.com/Gvasi/career-portfolio-template', type: 'github' }],
  },
  {
    id: 'research-dashboard',
    story: STORIES['research-dashboard'],
    title: 'Research Dashboard',
    shortName: 'Dashboard',
    status: 'in-progress',
    statusLabel: 'In Progress',
    thumbnail: '/images/projects/research-dashboard.png',
    thumbnailAlt: 'Research Dashboard — illustrative cover, not a finished product',
    artwork: { kind: 'illustration', src: '/images/projects/research-dashboard.png' },
    links: [],
  },
  {
    id: 'retention-signals',
    story: STORIES['retention-signals'],
    title: 'Retention Signals',
    shortName: 'Retention',
    status: 'concept',
    statusLabel: 'Concept',
    thumbnail: '/images/projects/retention-signals.png',
    thumbnailAlt: 'Concept illustration for Retention Signals; not a finished dashboard',
    artwork: { kind: 'illustration', src: '/images/projects/retention-signals.png' },
    links: [],
  },
]
