'use client'

import { useEffect, useRef, useState } from 'react'
import type { Story } from '@/content/home'

const TOKEN_PATTERN = /("[^"]*"?|#.*|\b(?:if|and|not|pass|raise|const|SELECT|FROM|WHERE|LIMIT|true)\b|\b\d+\b|[a-zA-Z_]+(?=\())/g
const KEYWORD_PATTERN = /^(if|and|not|pass|raise|const|SELECT|FROM|WHERE|LIMIT|true)$/

function Syntax({ text }: { text: string }) {
  return <>{text.split(TOKEN_PATTERN).map((part, i) => {
    const kind = part.startsWith('"') ? 'string'
      : part.startsWith('#') ? 'comment'
      : KEYWORD_PATTERN.test(part) ? 'keyword'
      : /^\d+$/.test(part) ? 'number'
      : text.slice(text.indexOf(part) + part.length).startsWith('(') ? 'function'
      : undefined
    return <span key={i} className={kind ? 'sg-syntax-' + kind : undefined}>{part}</span>
  })}</>
}

export default function TypedStory({ story, active, reduced }: { story: Story; active: boolean; reduced: boolean }) {
  const source = story.lines.join('\n')
  const total = source.length
  const [written, setWritten] = useState(story.lines[0].length)
  const writtenRef = useRef(story.lines[0].length)
  const nextCharacterIn = useRef(0)
  useEffect(() => {
    if (reduced || !active || writtenRef.current >= total) return
    let frame: number
    let previous = 0
    const tick = (time: number) => {
      if (previous) nextCharacterIn.current -= Math.min(time - previous, 80)
      previous = time
      const before = writtenRef.current
      while (nextCharacterIn.current <= 0 && writtenRef.current < total) {
        const character = source[writtenRef.current++]
        // The first line is present on arrival; don't add an invisible newline pause.
        nextCharacterIn.current += character === '\n' ? (writtenRef.current === story.lines[0].length + 1 ? 0 : 190) : 21
      }
      if (before !== writtenRef.current) setWritten(writtenRef.current)
      if (writtenRef.current < total) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, reduced, source, total, story])
  const count = reduced ? total : written
  const offsets = story.lines.map((_, i) => story.lines.slice(0, i).reduce((sum, line) => sum + line.length + 1, 0))
  const current = story.lines.findIndex((line, i) => count < offsets[i] + line.length + 1)
  return <div className="sg-typed-story" data-code-story={story.file} data-writing={count < total}>
    <span className="sg-refined-sr-only">{story.lines.join('\n')}</span>
    <div aria-hidden="true">{story.lines.map((line, i) => {
      const visible = line.slice(0, Math.max(0, count - offsets[i]))
      return <div className="sg-typed-row" data-current={count < total && i === current} key={i}>
        <span className="sg-typed-number">{String(i + 1).padStart(2, '0')}</span>
        <code>
          <span className="sg-code-reserve">{line}</span>
          <span className="sg-code-written">
            <Syntax text={visible}/>
            {count < total && i === current && <span className="sg-typing-cursor" data-running={active}/>}
            {!reduced && count === total && i === story.lines.length - 1 && <span className="sg-typing-cursor sg-typing-cursor-settled"/>}
          </span>
        </code>
      </div>
    })}</div>
  </div>
}
