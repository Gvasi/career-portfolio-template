'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

type Turnstile = {
  render: (target: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: Turnstile } }
export type BotCheckHandle = { getToken: () => Promise<string>; reset: () => void }
let scriptLoading: Promise<Turnstile> | undefined

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    const fail = () => { clearTimeout(timeout); script.remove(); scriptLoading = undefined; reject(new Error('The security check could not load. Please retry or use the email link.')) }
    const timeout = setTimeout(fail, 10_000)
    script.onload = () => { clearTimeout(timeout); if (window.turnstile) resolve(window.turnstile); else fail() }
    script.onerror = fail
    document.head.appendChild(script)
  })
  return scriptLoading
}

/** Managed verification stays visually quiet unless a visitor needs to interact. */
const BotCheck = forwardRef<BotCheckHandle, { action: 'contact' | 'booking' }>(function BotCheck({ action }, ref) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const widgetSize = useRef<'compact' | 'flexible'>('flexible')
  const token = useRef({ value: '', at: 0 })
  const waiting = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [error, setError] = useState('')
  const [interactive, setInteractive] = useState(false)
  const fail = useCallback((message: string) => {
    token.current = { value: '', at: 0 }
    setError(message)
    if (waiting.current) { clearTimeout(waiting.current.timer); waiting.current.reject(new Error(message)); waiting.current = null }
  }, [])
  const prepare = useCallback(async () => {
    if (!siteKey) return
    const api = await loadScript()
    if (!container.current || widget.current !== null) return
    widgetSize.current = container.current.clientWidth < 300 ? 'compact' : 'flexible'
    widget.current = api.render(container.current, {
      sitekey: siteKey, action, appearance: 'interaction-only', theme: 'light', size: widgetSize.current,
      'response-field': false,
      callback: (value: string) => {
        token.current = { value, at: Date.now() }; setError(''); setInteractive(false)
        if (waiting.current) { clearTimeout(waiting.current.timer); waiting.current.resolve(value); waiting.current = null }
      },
      'expired-callback': () => { token.current = { value: '', at: 0 } },
      'error-callback': () => { fail('The security check could not finish. Please retry or use the email link.'); return true },
      'timeout-callback': () => fail('The security check timed out. Please try again.'),
      'before-interactive-callback': () => setInteractive(true),
      'after-interactive-callback': () => setInteractive(false),
    })
  }, [siteKey, action, fail])
  useEffect(() => {
    void prepare().catch(error => fail(error.message))
    const observer = new ResizeObserver(() => {
      if (!container.current || widget.current === null) return
      const size = container.current.clientWidth < 300 ? 'compact' : 'flexible'
      if (size === widgetSize.current) return
      window.turnstile?.remove(widget.current)
      widget.current = null; token.current = { value: '', at: 0 }
      void prepare().catch(error => fail(error.message))
    })
    if (container.current) observer.observe(container.current)
    return () => {
      observer.disconnect()
      if (widget.current !== null) window.turnstile?.remove(widget.current)
      widget.current = null
      if (waiting.current) { clearTimeout(waiting.current.timer); waiting.current.reject(new Error('The form changed. Please try again.')); waiting.current = null }
    }
  }, [prepare, fail])
  const reset = useCallback(() => {
    token.current = { value: '', at: 0 }
    if (widget.current !== null) window.turnstile?.reset(widget.current)
  }, [])
  useImperativeHandle(ref, () => ({
    reset,
    getToken: async () => {
      if (!siteKey) {
        // A local preview or a demo deployment has no bot check; the routes simulate or refuse accordingly.
        if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return ''
        throw new Error('The security check is unavailable. Please use the email link.')
      }
      await prepare()
      if (token.current.value && Date.now() - token.current.at < 240_000) return token.current.value
      setError('')
      const result = new Promise<string>((resolve, reject) => {
        waiting.current = { resolve, reject, timer: setTimeout(() => fail('Please finish the security check and try again.'), 90_000) }
      })
      reset()
      return result
    },
  }), [siteKey, prepare, reset, fail])
  return <div className="contact-bot-check !mt-0">
    {interactive && <p className="mb-2 pt-3 text-xs text-slate-600" role="status">One quick security check, then you’re ready.</p>}
    <div ref={container} className="flex justify-center" />
    {error && <p role="status" className="pt-3 text-xs text-slate-600">{error} <button type="button" className="min-h-11 underline" onClick={() => { setError(''); void prepare().then(reset).catch(error => fail(error.message)) }}>Retry check</button></p>}
  </div>
})

export default BotCheck
