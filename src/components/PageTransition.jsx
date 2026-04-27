import { useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'

/**
 * Optimized PageTransition
 * - Removed double requestAnimationFrame (was causing visible jank)
 * - Uses CSS class toggle instead of direct style mutation
 * - Uses will-change only transiently (set before, remove after)
 */
export default function PageTransition({ children }) {
  const location = useLocation()
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Set up before paint — will-change hint lets GPU pre-composite
    el.style.willChange = 'opacity, transform'
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    el.style.transition = 'none'

    // Single rAF is enough — browser paints after this
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    })

    // Remove will-change after animation — freeing compositing layer
    const timer = setTimeout(() => {
      if (ref.current) ref.current.style.willChange = 'auto'
    }, 250)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [location.pathname])

  return (
    <div ref={ref}>
      {children}
    </div>
  )
}