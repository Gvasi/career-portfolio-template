import { ChartNoAxesCombined, Presentation, Eye, RefreshCw, Route, Flag, Compass, Users, ChartPie, Megaphone, type LucideIcon } from 'lucide-react'

/** One set of learning points for the desktop record and mobile wallet. */
export const credentialFocus: Record<string, { Icon: LucideIcon; detail: string }> = {
  'Business Questions': { Icon: Compass, detail: 'Guide decisions' },
  'Data Quality': { Icon: Eye, detail: 'Check the data' },
  Analysis: { Icon: ChartNoAxesCombined, detail: 'Use SQL & R' },
  'Clear Findings': { Icon: Presentation, detail: 'Tableau, Power BI' },
  Agile: { Icon: RefreshCw, detail: 'Learn & adapt' },
  Planning: { Icon: Route, detail: 'Time & priorities' },
  Stakeholders: { Icon: Users, detail: 'Who needs what' },
  Risks: { Icon: Flag, detail: 'Spot risks early' },
  'Business Strategy': { Icon: Compass, detail: 'Choices to goals' },
  Management: { Icon: Users, detail: 'Work together' },
  Finance: { Icon: ChartPie, detail: 'Cost trade-offs' },
  Marketing: { Icon: Megaphone, detail: 'Customer value' },
}
