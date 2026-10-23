import { useEffect, useLayoutEffect, useRef } from 'react'
import { Plus } from 'lucide-react'

const SIZE = 52           // diameter tombol (px), harus sama dengan CSS .fab
const MARGIN = 16         // jarak minimum dari tepi layar / topbar / bottom nav
const DRAG_THRESHOLD = 6  // geser minimal (px) sebelum dianggap drag, bukan tap
const STORAGE_KEY = 'fab-position-v1'

/* ── Preferensi posisi: sisi (kiri/kanan) + posisi vertikal (0..1) ── */
function loadPref() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (p && (p.side === 'left' || p.side === 'right') && typeof p.ry === 'number') {
      return { side: p.side, ry: Math.min(Math.max(p.ry, 0), 1) }
    }
  } catch { /* abaikan */ }
  return { side: 'right', ry: 1 } // default: kanan bawah, tepat di atas bottom nav
}

function savePref(pref) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pref)) } catch { /* abaikan */ }
}

/* ── Area yang boleh dipakai tombol: di antara topbar dan bottom nav ── */
function getBounds() {
  const topEl = document.querySelector('.mobile-topbar')
  const botEl = document.querySelector('.mobile-bottom-nav')
  const topRect = topEl?.getBoundingClientRect()
  const botRect = botEl?.getBoundingClientRect()

  const top = (topRect && topRect.height > 0 ? topRect.bottom : 0) + MARGIN
  const bottomEdge = botRect && botRect.height > 0 ? botRect.top : window.innerHeight
  const minY = top
  const maxY = Math.max(minY, bottomEdge - SIZE - MARGIN)

  return { minX: MARGIN, maxX: Math.max(MARGIN, window.innerWidth - SIZE - MARGIN), minY, maxY }
}

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export default function DraggableFab({ onClick }) {
  const btnRef = useRef(null)
  const pref = useRef(loadPref())
  const pos = useRef({ x: 0, y: 0 })
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 })

  function apply(x, y, animate) {
    const el = btnRef.current
    if (!el) return
    el.style.transition = animate
      ? 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s'
      : 'box-shadow 0.18s'
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    pos.current = { x, y }
  }

  function placeFromPref(animate = false) {
    const b = getBounds()
    const { side, ry } = pref.current
    const x = side === 'left' ? b.minX : b.maxX
    const y = b.minY + ry * (b.maxY - b.minY)
    apply(x, y, animate)
  }

  // Posisi awal (sebelum paint, supaya tidak berkedip)
  useLayoutEffect(() => { placeFromPref(false) }, [])

  // Hitung ulang saat layar berubah (rotasi, resize, keyboard)
  useEffect(() => {
    const onResize = () => placeFromPref(false)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const d = drag.current
    d.active = true
    d.moved = false
    d.startX = e.clientX
    d.startY = e.clientY
    d.originX = pos.current.x
    d.originY = pos.current.y
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e) {
    const d = drag.current
    if (!d.active) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY

    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      d.moved = true
      btnRef.current?.classList.add('fab-dragging')
    }

    const b = getBounds()
    apply(
      clamp(d.originX + dx, b.minX, b.maxX),
      clamp(d.originY + dy, b.minY, b.maxY),
      false
    )
  }

  function finishDrag(e, cancelled = false) {
    const d = drag.current
    if (!d.active) return
    d.active = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    btnRef.current?.classList.remove('fab-dragging')

    if (!d.moved) return

    // Snap ke tepi kiri/kanan terdekat, tinggi vertikal tetap
    const b = getBounds()
    const centerX = pos.current.x + SIZE / 2
    const side = centerX < window.innerWidth / 2 ? 'left' : 'right'
    const range = b.maxY - b.minY
    const ry = range > 0 ? clamp((pos.current.y - b.minY) / range, 0, 1) : 1

    pref.current = { side, ry }
    savePref(pref.current)
    placeFromPref(true)
  }

  function handleClick() {
    // Setelah drag, klik yang menyusul tidak boleh membuka modal
    if (drag.current.moved) { drag.current.moved = false; return }
    onClick?.()
  }

  return (
    <button
      ref={btnRef}
      className="fab"
      aria-label="Tambah transaksi (tahan dan geser untuk memindahkan)"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={e => finishDrag(e)}
      onPointerCancel={e => finishDrag(e, true)}
      onClick={handleClick}
      onContextMenu={e => e.preventDefault()}
    >
      <Plus className="fab-icon" size={22} strokeWidth={2.5} />
    </button>
  )
}
