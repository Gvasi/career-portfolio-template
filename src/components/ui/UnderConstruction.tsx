import { NotebookPen } from 'lucide-react'
import Link from 'next/link'

interface UnderConstructionProps { title?: string; message?: string }

export default function UnderConstruction({
  title = 'Under Construction',
  message = "We're building something amazing. Check back soon!",
}: UnderConstructionProps) {
  return <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
    <div aria-hidden="true" className="mb-8 grid h-24 w-24 place-items-center rounded-full border border-[#d5e5e1] bg-[#f2f7f6] text-[#118578]"><NotebookPen size={36} strokeWidth={1.5}/></div>
    <h1 className="text-3xl md:text-4xl font-bold text-[var(--c-navy)] mb-4 text-balance">{title}</h1>
    <p className="text-[#526a82] mb-8 max-w-md text-pretty">{message}</p>
    <Link href="/" className="btn btn-emerald">Return Home</Link>
  </div>
}
