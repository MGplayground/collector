import { useCallback, useEffect, useRef } from 'react'

/**
 * Pointer-driven 3D tilt.
 *
 * Cards take the full angle — a card is a flat printed plane, so a wide tilt
 * reads correctly. Sealed product takes roughly a third of it: a booster box
 * photo already contains its own perspective, and a wide flat-plane rotation
 * fights it until the box reads as a wobbling picture rather than an object.
 *
 * Only the element under the pointer ever gets a transform, so a full grid
 * never recomposites at once.
 */
export function useTilt({ maxTilt = 15, scale = 1.04 } = {}) {
  const ref = useRef(null)
  const reduced = useRef(false)

  const rest = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('is-tilting')
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--sc', '1')
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.current = query.matches
    const onPrefChange = e => { reduced.current = e.matches; if (e.matches) rest() }
    query.addEventListener('change', onPrefChange)

    function apply(clientX, clientY) {
      if (reduced.current) return
      const r = el.getBoundingClientRect()
      const px = Math.min(Math.max((clientX - r.left) / r.width, 0), 1)
      const py = Math.min(Math.max((clientY - r.top) / r.height, 0), 1)
      el.classList.add('is-tilting')
      el.style.setProperty('--rx', `${((0.5 - py) * 2 * maxTilt).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${((px - 0.5) * 2 * maxTilt).toFixed(2)}deg`)
      el.style.setProperty('--sc', String(scale))
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
    }

    const onMove = e => apply(e.clientX, e.clientY)

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', rest)
    el.addEventListener('pointercancel', rest)
    el.addEventListener('blur', rest)

    return () => {
      query.removeEventListener('change', onPrefChange)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', rest)
      el.removeEventListener('pointercancel', rest)
      el.removeEventListener('blur', rest)
    }
  }, [maxTilt, scale, rest])

  return ref
}
