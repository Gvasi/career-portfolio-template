'use client'

import { useRef } from 'react'
import { site } from '@/config/site'
import { closingPhrases } from '@/content/home'
import styles from './Cta.module.css'
import { useClosingReel } from './useClosingReel'
import { useSecondaryWidth } from './useSecondaryWidth'

export default function Cta() {
  const rootRef = useRef<HTMLElement | null>(null)
  const secondaryContainerRef = useRef<HTMLSpanElement | null>(null)
  const reel = useClosingReel(rootRef)
  useSecondaryWidth(secondaryContainerRef)
  const currentSet = closingPhrases[reel.primaryIndex]

  return (
    <section id="contact" ref={rootRef} className={`section-shell cta-section ${styles.root}`} data-cta-active={reel.isActive ? 'true' : 'false'} data-cta-animating={reel.isAnimating ? 'true' : 'false'}>
      <div className="headline-wrapper" aria-label="Let's talk">
        <h2 className="section-title text-center">
          <span className="sr-only">Idea worth trying? Let&apos;s build the first version.</span>
          <span id="primaryContainer" className="primary-container" aria-hidden="true">
            {closingPhrases.map((set, index) => (
              <span
                key={set.primary}
                data-index={index}
                className={`row primary-word ${index === reel.primaryIndex && reel.primaryPhase !== 'hidden' ? reel.primaryPhase : ''}`}
              >
                {set.primary}
              </span>
            ))}
          </span>
          <span ref={secondaryContainerRef} id="secondaryContainer" className="secondary-container" aria-hidden="true">
            <span id="secondaryStack" className="secondary-stack">
              {currentSet.secondary.map((phrase, index) => {
                const isVisible = index === reel.secondaryIndex && reel.secondaryPhase !== 'hidden'
                return (
                  <span
                    key={`${reel.primaryIndex}-${phrase.k}`}
                    data-index={index}
                    className={`row secondary-word ${isVisible ? reel.secondaryPhase : ''}`}
                  >
                    {isVisible ? phrase.t.split('').map((character, characterIndex) => (
                      <span key={characterIndex} className="char-secondary" style={{ animationDelay: `${characterIndex * 40}ms` }}>
                        {character === ' ' ? '\u00a0' : character}
                      </span>
                    )) : null}
                  </span>
                )
              })}
            </span>
          </span>
        </h2>
      </div>
      <div className="cta-final">
        <div className="wrap">
          <a id="ctaButton" className="btn" href="/contact" aria-label={`Let’s talk — send ${site.firstName} a message`}>
            Let&apos;s talk
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M7 7h10v10" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
