export type ProjectStatus = 'live' | 'in-progress' | 'concept'

/** A real destination shown on the card. The visible label is derived from the type. */
export interface ProjectLink {
  url: string
  type: 'demo' | 'github'
}

/** How the reel draws a project: the site itself on the laptop composition, or a full-bleed illustration. */
export type ProjectArtwork =
  | { kind: 'site-preview'; screenshot: string }
  | { kind: 'illustration'; src: string }

export interface ProjectCardData {
  id: string
  title: string
  /** Short name under the phone reel thumbnails; defaults to the title. */
  shortName?: string
  status: ProjectStatus
  statusLabel: string
  /** Small image in the project dialog header. */
  thumbnail: string
  thumbnailAlt: string
  artwork: ProjectArtwork
  links: ProjectLink[]
  story: ProjectStory
}

/** Glyphs drawn in ProjectMap; one per story part. */
export type PartIcon =
  | 'stories' | 'message' | 'meeting'
  | 'data' | 'rules' | 'activity'
  | 'retention' | 'promotion' | 'value'
  | 'bots' | 'copy' | 'wallet'
  | 'checkout' | 'qr' | 'confirm' | 'ledger'

/** Each project carries its own story; the viewer has no fixed project slots. */
export interface ProjectStory {
  intro: string
  summary: string
  map: {
    label: string
    kind: 'journey' | 'workflow' | 'questions'
    parts: { label: string; icon: PartIcon; title: string; detail: string }[]
  }
  learning: { label: string; title: string; body: string }
  subtitle: string
  next: string
  decisions: { label: string; question: string; title: string; body: string; takeaway: string }[]
  tools: { name: string; label?: string; role: string; detail: string; why: string }[]
}
