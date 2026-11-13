import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays } from 'lucide-react'
import { getCurrentMonth, getMonthName } from '../lib/utils'
import './Select.css'
import './DatePicker.css'
import './MonthNav.css'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const POP_W = 288
const POP_H = 330
const GAP = 8
const EDGE = 12

function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const on = e => setM(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

/**
 * Props:
 *  month, year   bulan yang sedang dilihat
 *  onChange      ({ month, year }) => void
 * Bulan setelah bulan berjalan tidak bisa dipilih.
 */
export default function MonthNav({ month, year, onChange, compact = false }) {
  const now = getCurrentMonth()
  const [open, setOpen] = useState(false)
  const [yearView, setYearView] = useState(year)
  const [picked, setPicked] = useState(null)
  const [pos, setPos] = useState(null)
  const isMobile = useIsMobile()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const toIdx = (y, m) => y * 12 + (m - 1)
  const curIdx = toIdx(year, month)
  const maxIdx = toIdx(now.year, now.month)
  const atMax = curIdx >= maxIdx
  const atNow = year === now.year && month === now.month

  function go(delta) {
    const t = curIdx + delta
    if (t > maxIdx) return
    onChange({ month: (t % 12) + 1, year: Math.floor(t / 12) })
  }

  function openMenu() { setYearView(year); setPicked(null); setOpen(true) }
  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  function pickMonth(m) {
    if (picked) return
    setPicked(m)
    timer.current = setTimeout(() => {
      setPicked(null)
      close()
      if (!(yearView === year && m === month)) onChange({ month: m, year: yearView })
    }, 130)
  }

  function pickNow() {
    close()
    if (!atNow) onChange({ month: now.month, year: now.year })
  }

  /* ── Posisi popover (desktop), ditengahkan di bawah tombol ── */
  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const vh = window.innerHeight, vw = window.innerWidth
    const below = vh - r.bottom - EDGE - GAP
    const above = r.top - EDGE - GAP
    const up = below < POP_H && above > below
    const left = Math.max(EDGE, Math.min(r.left + r.width / 2 - POP_W / 2, vw - POP_W - EDGE))
    setPos({
      left, width: POP_W,
      maxHeight: Math.max(240, up ? above : below),
      ...(up ? { bottom: vh - r.top + GAP } : { top: r.bottom + GAP }),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open || isMobile) { setPos(null); return }
    place()
    const on = e => { if (panelRef.current?.contains(e.target)) return; place() }
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('scroll', on, true)
    }
  }, [open, isMobile, place])

  /* ── Tutup saat klik di luar (desktop) / Escape ── */
  useEffect(() => {
    if (!open) return
    const down = e => {
      if (isMobile) return
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const key = e => { if (e.key === 'Escape') close() }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, isMobile, close])

  /* ── Kunci scroll saat bottom sheet terbuka ── */
  useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  function onKeyDown(e) {
    if (open) return
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
  }

  const body = (
    <div className="dp-body">
      <div className="dp-head">
        <button type="button" className="dp-nav" aria-label="Tahun sebelumnya" onClick={() => setYearView(y => y - 1)}>
          <ChevronLeft size={16} />
        </button>
        <div className="mn-year">{yearView}</div>
        <button type="button" className="dp-nav" aria-label="Tahun berikutnya" disabled={yearView >= now.year}
          onClick={() => setYearView(y => y + 1)} style={yearView >= now.year ? { opacity: 0.35, cursor: 'default' } : undefined}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="dp-months">
        {MONTHS_SHORT.map((label, i) => {
          const m = i + 1
          const off = toIdx(yearView, m) > maxIdx
          const sel = picked ? picked === m : (yearView === year && m === month)
          const isNow = yearView === now.year && m === now.month
          return (
            <button
              key={m} type="button" disabled={off}
              className={`dp-month${sel ? ' is-sel' : ''}${isNow ? ' is-today' : ''}`}
              onClick={() => pickMonth(m)}
            >{label}</button>
          )
        })}
      </div>

      <div className="dp-foot">
        <button type="button" className="dp-link" onClick={pickNow} disabled={atNow}>Bulan ini</button>
      </div>
    </div>
  )

  return (
    <>
      <div className={`mn${compact ? ' mn-compact' : ''}`} onKeyDown={onKeyDown}>
        <button type="button" className="mn-step" aria-label="Bulan sebelumnya" onClick={() => go(-1)}>
          <ChevronLeft size={17} />
        </button>

        <button
          ref={triggerRef}
          type="button"
          className={`mn-trigger${open ? ' is-open' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? close(false) : openMenu())}
        >
          <CalendarDays size={15} className="mn-ico" />
          <span className="mn-label" key={`${year}-${month}`}>{getMonthName(month, year)}</span>
          <ChevronDown size={14} className="mn-chev" />
        </button>

        <button type="button" className="mn-step" aria-label="Bulan berikutnya" disabled={atMax} onClick={() => go(1)}>
          <ChevronRight size={17} />
        </button>
      </div>

      {open && createPortal(
        isMobile ? (
          <div className="sel-layer">
            <div className="sel-backdrop" onClick={() => close()} />
            <div ref={panelRef} className="sel-sheet dp-sheet" role="dialog" aria-label="Pilih bulan" onMouseDown={e => e.preventDefault()}>
              <div className="sel-grabber" />
              <div className="sel-sheet-title">Pilih Bulan</div>
              {body}
            </div>
          </div>
        ) : (
          <div ref={panelRef} className="sel-pop dp-pop" role="dialog" aria-label="Pilih bulan"
            style={pos || { visibility: 'hidden' }} onMouseDown={e => e.preventDefault()}>
            {body}
          </div>
        ),
        document.body
      )}
    </>
  )
}