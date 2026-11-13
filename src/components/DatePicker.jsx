import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { todayStr } from '../lib/utils'
import './Select.css'
import './DatePicker.css'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const POP_W = 296
const POP_H = 372
const GAP = 6
const EDGE = 12

const pad = n => String(n).padStart(2, '0')
const toStr = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`

function parse(s) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return y && m && d ? { y, m, d } : null
}

// Geser n bulan; hari dipotong kalau bulan tujuan lebih pendek (31 Jan -> 28 Feb)
function shiftMonth({ y, m, d }, n) {
  const t = m - 1 + n
  const ny = y + Math.floor(t / 12)
  const nm = ((t % 12) + 12) % 12 + 1
  return { y: ny, m: nm, d: Math.min(d, new Date(ny, nm, 0).getDate()) }
}

function addDays({ y, m, d }, n) {
  const dt = new Date(y, m - 1, d + n)
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
}

function formatDisplay(s) {
  const p = parse(s)
  if (!p) return ''
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(p.y, p.m - 1, p.d))
}

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
 *  value        'YYYY-MM-DD' atau '' (kosong)
 *  onChange(v)  menerima 'YYYY-MM-DD' atau '' (saat dihapus)
 *  min, max     batas tanggal 'YYYY-MM-DD' (opsional)
 *  placeholder  teks saat kosong
 *  title        judul bottom sheet di HP
 *  leftIcon     ikon kiri (default: Calendar)
 *  required     validasi form + menyembunyikan tombol "Hapus"
 *  disabled, id, className, style
 */
export default function DatePicker({
  value, onChange, min, max, placeholder = 'Pilih tanggal', title,
  leftIcon: LeftIcon = Calendar, required = false, disabled = false,
  id, className = '', style,
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // 'days' | 'months'
  const [cursor, setCursor] = useState(null) // tanggal yang disorot / bulan yang tampil
  const [yearView, setYearView] = useState(new Date().getFullYear())
  const [pos, setPos] = useState(null)
  const isMobile = useIsMobile()
  const uid = useId()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const [flashDay, setFlashDay] = useState(null)
  const [flash, setFlash] = useState(false)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const today = todayStr()
  const isOff = s => (min && s < min) || (max && s > max)

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  function openMenu() {
    if (disabled) return
    const start = parse(value) || parse(today)
    setCursor(start)
    setYearView(start.y)
    setView('days')
    setOpen(true)
  }

  function pick(c) {
    const s = toStr(c)
    if (isOff(s) || flashDay) return
    setFlashDay(s)
    timers.current.push(setTimeout(() => {
      setFlashDay(null)
      close()
      if (s !== value) {
        onChange(s)
        setFlash(true)
        timers.current.push(setTimeout(() => setFlash(false), 700))
      }
    }, 140))
  }

  function pickToday() { pick(parse(today)) }
  function clear() { onChange(''); close() }

  /* ── Posisi popover (desktop) ── */
  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const vh = window.innerHeight, vw = window.innerWidth
    const below = vh - r.bottom - EDGE - GAP
    const above = r.top - EDGE - GAP
    const up = below < POP_H && above > below
    const left = Math.max(EDGE, Math.min(r.left, vw - POP_W - EDGE))
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

  /* ── Tutup saat klik di luar (desktop) ── */
  useEffect(() => {
    if (!open || isMobile) return
    const down = e => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [open, isMobile])

  /* ── Kunci scroll halaman saat bottom sheet terbuka ── */
  useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  function onKeyDown(e) {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
    if (e.key === 'Tab') { setOpen(false); return }
    if (view !== 'days') return
    const mv = fn => { e.preventDefault(); setCursor(c => fn(c)) }
    switch (e.key) {
      case 'ArrowLeft': mv(c => addDays(c, -1)); break
      case 'ArrowRight': mv(c => addDays(c, 1)); break
      case 'ArrowUp': mv(c => addDays(c, -7)); break
      case 'ArrowDown': mv(c => addDays(c, 7)); break
      case 'PageUp': mv(c => shiftMonth(c, e.shiftKey ? -12 : -1)); break
      case 'PageDown': mv(c => shiftMonth(c, e.shiftKey ? 12 : 1)); break
      case 'Enter':
      case ' ': e.preventDefault(); if (cursor) pick(cursor); break
      default:
    }
  }

  /* ── Isi panel ── */
  function renderCalendar() {
    if (!cursor) return null

    if (view === 'months') {
      return (
        <>
          <div className="dp-head">
            <button type="button" className="dp-nav" aria-label="Tahun sebelumnya" onClick={() => setYearView(y => y - 1)}><ChevronLeft size={16} /></button>
            <button type="button" className="dp-title" onClick={() => setView('days')}>{yearView}<ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} /></button>
            <button type="button" className="dp-nav" aria-label="Tahun berikutnya" onClick={() => setYearView(y => y + 1)}><ChevronRight size={16} /></button>
          </div>
          <div className="dp-months">
            {MONTHS_SHORT.map((label, i) => {
              const m = i + 1
              const first = toStr({ y: yearView, m, d: 1 })
              const last = toStr({ y: yearView, m, d: new Date(yearView, m, 0).getDate() })
              const off = (min && last < min) || (max && first > max)
              const isCur = cursor.y === yearView && cursor.m === m
              return (
                <button
                  key={m} type="button" disabled={off}
                  className={`dp-month${isCur ? ' is-sel' : ''}${today.startsWith(`${yearView}-${pad(m)}`) ? ' is-today' : ''}`}
                  onClick={() => {
                    setCursor(c => ({ y: yearView, m, d: Math.min(c.d, new Date(yearView, m, 0).getDate()) }))
                    setView('days')
                  }}
                >{label}</button>
              )
            })}
          </div>
        </>
      )
    }

    const offset = (new Date(cursor.y, cursor.m - 1, 1).getDay() + 6) % 7 // Senin = 0
    const cells = Array.from({ length: 42 }, (_, i) => {
      const c = addDays({ y: cursor.y, m: cursor.m, d: 1 }, i - offset)
      return { ...c, s: toStr(c), out: c.m !== cursor.m }
    })
    const cursorStr = toStr(cursor)
    const selStr = flashDay || value

    return (
      <>
        <div className="dp-head">
          <button type="button" className="dp-nav" aria-label="Bulan sebelumnya" onClick={() => setCursor(c => shiftMonth(c, -1))}><ChevronLeft size={16} /></button>
          <button type="button" className="dp-title" onClick={() => { setYearView(cursor.y); setView('months') }}>
            {MONTHS[cursor.m - 1]} {cursor.y}<ChevronDown size={14} />
          </button>
          <button type="button" className="dp-nav" aria-label="Bulan berikutnya" onClick={() => setCursor(c => shiftMonth(c, 1))}><ChevronRight size={16} /></button>
        </div>

        <div className="dp-week" aria-hidden="true">
          {DAYS.map(d => <span key={d}>{d}</span>)}
        </div>

        <div className="dp-grid" role="grid" aria-label={`${MONTHS[cursor.m - 1]} ${cursor.y}`}>
          {cells.map(c => {
            const off = isOff(c.s)
            return (
              <button
                key={c.s}
                id={`${uid}-${c.s}`}
                type="button"
                role="gridcell"
                tabIndex={-1}
                disabled={off}
                aria-selected={c.s === selStr}
                aria-current={c.s === today ? 'date' : undefined}
                className={[
                  'dp-day',
                  c.out ? 'is-out' : '',
                  c.s === today ? 'is-today' : '',
                  c.s === selStr ? 'is-sel' : '',
                  c.s === cursorStr && c.s !== selStr ? 'is-hi' : '',
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => { if (!c.out) setCursor({ y: c.y, m: c.m, d: c.d }) }}
                onClick={() => pick(c)}
              >{c.d}</button>
            )
          })}
        </div>
      </>
    )
  }

  const body = (
    <div className="dp-body">
      {renderCalendar()}
      <div className="dp-foot">
        <button type="button" className="dp-link" onClick={pickToday} disabled={isOff(today)}>Hari ini</button>
        {!required && value && <button type="button" className="dp-link dp-link-muted" onClick={clear}>Hapus</button>}
      </div>
    </div>
  )

  return (
    <>
      <div className={`sel ${className}`} style={style}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={`sel-trigger has-left${open ? ' is-open' : ''}${value ? '' : ' is-placeholder'}${flash ? ' is-flash' : ''}`}disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-activedescendant={open && view === 'days' && cursor ? `${uid}-${toStr(cursor)}` : undefined}
          onClick={() => (open ? close(false) : openMenu())}
          onKeyDown={onKeyDown}
        >
          <LeftIcon size={17} className="sel-left" />
          <span className="sel-value">{value ? formatDisplay(value) : placeholder}</span>
          <ChevronDown size={16} className="sel-chev" />
        </button>

        {required && (
          <input
            className="sel-native" tabIndex={-1} aria-hidden="true" required
            value={value ?? ''} onChange={() => {}}
            onFocus={() => triggerRef.current?.focus()}
          />
        )}
      </div>

      {open && createPortal(
        isMobile ? (
          <div className="sel-layer">
            <div className="sel-backdrop" onClick={() => close()} />
            <div ref={panelRef} className="sel-sheet dp-sheet" role="dialog" aria-label={title || placeholder} onMouseDown={e => e.preventDefault()}>
              <div className="sel-grabber" />
              <div className="sel-sheet-title">{title || placeholder}</div>
              {body}
            </div>
          </div>
        ) : (
          <div
            ref={panelRef}
            className="sel-pop dp-pop"
            role="dialog"
            aria-label={title || placeholder}
            style={pos || { visibility: 'hidden' }}
            onMouseDown={e => e.preventDefault()}
          >
            {body}
          </div>
        ),
        document.body
      )}
    </>
  )
}