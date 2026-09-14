'use client'

import { useEffect, useState } from 'react'

// Marketing-page header: sticks to the top, slides away while scrolling down, and slides back
// in on scroll-up. At the very top of the page it's transparent and always shown; once you're
// further down it gets a solid background so it stays readable over content.
export default function StickyHeader({ children }: { children: React.ReactNode }) {
  const [atTop, setAtTop] = useState(true)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0

    const update = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - lastY

      if (y < 12) {
        setAtTop(true)
        setHidden(false)
      } else {
        setAtTop(false)
        // Ignore tiny jitters (trackpads, momentum) so it doesn't flicker.
        if (delta > 6 && y > 96) setHidden(true)
        else if (delta < -6) setHidden(false)
      }
      lastY = y
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header
      data-state={hidden ? 'hidden' : 'shown'}
      className={`sticky top-0 z-50 transition-[transform,background-color,box-shadow] duration-300 ease-out focus-within:translate-y-0 motion-reduce:transition-none ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      } ${
        atTop
          ? 'bg-transparent'
          : 'bg-[#F7F4EE]/90 shadow-[0_1px_0_rgba(30,27,22,0.08)] backdrop-blur-md'
      }`}
    >
      {children}
    </header>
  )
}
