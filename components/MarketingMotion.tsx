'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

// All marketing-page motion lives here, driven by data attributes on the server-rendered markup:
//   data-hero="nav|eyebrow|title|copy|form|media"  staged intro on load (hidden by CSS until it runs)
//   data-hero-img                                   image inside the hero media, zooms out on intro
//   data-split                                      heading revealed line by line on scroll
//   data-reveal                                     fades/rises in, batched and staggered on scroll
//   data-parallax                                   oversized image wrapper that drifts while scrolling
//   data-marquee                                    ticker track (content duplicated twice), loops forever
//   data-lot-grid / -card / -body                    desktop: card stack that fans out and opens when in view
//   data-banner                                     section that expands from an inset card to full bleed
// Everything is skipped for prefers-reduced-motion, where content simply shows.

// Reveals a heading line by line from behind a mask. Each line's mask is widened with a negative
// clip-path inset so ascenders, descenders and italic overhang aren't cut off by the tight
// line-height, and the split is reverted once the reveal finishes so text at rest is plain text.
function revealLines(el: Element, vars: gsap.TweenVars) {
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit: (self) => {
      const masks = self.lines.map((line) => line.parentElement).filter(Boolean)
      gsap.set(masks, { overflow: 'visible', clipPath: 'inset(-0.25em -0.2em -0.3em -0.2em)' })
      return gsap.from(self.lines, {
        yPercent: 150,
        ease: 'power4.out',
        ...vars,
        onComplete: () => self.revert(),
      })
    },
  })
}

export default function MarketingMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const mm = gsap.matchMedia()

      mm.add(
        {
          motionOK: '(prefers-reduced-motion: no-preference)',
          isDesktop: '(min-width: 1024px)',
        },
        (context) => {
          const { motionOK, isDesktop } = context.conditions as { motionOK: boolean; isDesktop: boolean }
          gsap.set(q('[data-hero]'), { visibility: 'visible' })
          if (!motionOK) return

          // Listing cards (desktop): sit as a tilted stack, then fan out into their grid slots and
          // open up once, when the row comes into view. Plays on its own; not tied to scroll position.
          const grid = q('[data-lot-grid]')[0] as HTMLElement | undefined
          const cards = q('[data-lot-card]') as HTMLElement[]
          const bodies = q('[data-lot-body]')
          const fanOut = isDesktop && grid && cards.length > 0

          if (fanOut) {
            // Offset from each card's own grid slot to the centre of the grid, using layout
            // positions (offsetLeft) so the measurement ignores the transforms being animated.
            const toCenter = (card: HTMLElement) => grid.offsetWidth / 2 - (card.offsetLeft + card.offsetWidth / 2)
            const tilt = [-9, 3, 11]
            const drop = [26, 0, 48]
            const layer = [2, 3, 1]

            gsap.set(cards, { zIndex: (i) => layer[i] ?? 1 })
            gsap
              .timeline({
                scrollTrigger: { trigger: grid, start: 'top 75%', once: true },
              })
              .fromTo(
                cards,
                {
                  x: (_, card) => toCenter(card as HTMLElement),
                  y: (i) => drop[i] ?? 0,
                  rotation: (i) => tilt[i] ?? 0,
                  scale: 0.9,
                },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 1.2, ease: 'power3.inOut', delay: 0.15 }
              )
              .fromTo(
                bodies,
                { opacity: 0, y: 18 },
                { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: 'power2.out' },
                0.95
              )
          }

          // Hero intro
          gsap
            .timeline({ defaults: { ease: 'power3.out' } })
            .from(q('[data-hero="nav"] > *'), { y: -18, opacity: 0, duration: 0.8, stagger: 0.08 }, 0)
            .from(q('[data-hero="eyebrow"]'), { y: 14, opacity: 0, duration: 0.7 }, 0.15)
            .fromTo(
              q('[data-hero="media"]'),
              { clipPath: 'inset(100% 0% 0% 0% round 18px)' },
              { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.5, ease: 'expo.out' },
              0.2
            )
            .from(q('[data-hero-img]'), { scale: 1.3, duration: 2, ease: 'expo.out' }, 0.2)
            .from(q('[data-hero="copy"]'), { y: 24, opacity: 0, duration: 0.9 }, 0.65)
            .from(q('[data-hero="form"]'), { y: 24, opacity: 0, duration: 0.9 }, 0.8)

          q('[data-hero="title"]').forEach((title) =>
            revealLines(title, { duration: 1.15, stagger: 0.12, delay: 0.3 })
          )

          // Headings: line-by-line reveal as they scroll in
          q('[data-split]').forEach((heading) =>
            revealLines(heading, {
              duration: 1,
              stagger: 0.1,
              scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
            })
          )

          // Cards, steps, list items: staggered rise, batched so neighbours animate together.
          // On smaller screens the listing cards join this instead of the fan-out.
          const reveals = [...q('[data-reveal]'), ...(fanOut ? [] : cards)]
          gsap.set(reveals, { opacity: 0, y: 36 })
          ScrollTrigger.batch(reveals, {
            start: 'top 90%',
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out' }),
          })

          // Parallax photos
          q('[data-parallax]').forEach((layer) => {
            gsap.fromTo(
              layer,
              { yPercent: -6 },
              {
                yPercent: 6,
                ease: 'none',
                scrollTrigger: {
                  trigger: layer.parentElement,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: true,
                },
              }
            )
          })

          // Ticker: slow constant loop, nudged a little faster by scroll velocity, then eased back
          q('[data-marquee]').forEach((track) => {
            const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 60, repeat: -1 })
            ScrollTrigger.create({
              trigger: track,
              start: 'top bottom',
              end: 'bottom top',
              onUpdate: (self) => {
                const boost = gsap.utils.clamp(1, 2, 1 + Math.abs(self.getVelocity()) / 2500)
                gsap.to(loop, {
                  timeScale: boost,
                  duration: 0.4,
                  overwrite: true,
                  onComplete: () => {
                    gsap.to(loop, { timeScale: 1, duration: 1.6, ease: 'power2.out' })
                  },
                })
              },
            })
          })

          // Closing banner grows from an inset rounded card to full width
          q('[data-banner]').forEach((banner) => {
            gsap.fromTo(
              banner,
              { clipPath: 'inset(7% 4% 7% 4% round 28px)' },
              {
                clipPath: 'inset(0% 0% 0% 0% round 0px)',
                ease: 'none',
                scrollTrigger: { trigger: banner, start: 'top 95%', end: 'top 30%', scrub: true },
              }
            )
          })

          // FAQ answers ease open instead of snapping
          const faqItems = q('details')
          const onToggle = (event: Event) => {
            const details = event.currentTarget as HTMLDetailsElement
            const answer = details.querySelector('p')
            if (details.open && answer) {
              gsap.fromTo(
                answer,
                { height: 0, opacity: 0 },
                { height: 'auto', opacity: 1, duration: 0.45, ease: 'power2.out', clearProps: 'height' }
              )
            }
          }
          faqItems.forEach((item) => item.addEventListener('toggle', onToggle))
          return () => faqItems.forEach((item) => item.removeEventListener('toggle', onToggle))
        }
      )
    },
    { scope: root }
  )

  return <div ref={root}>{children}</div>
}
