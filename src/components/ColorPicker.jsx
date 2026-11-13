import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Pipette, Tag, AlertTriangle } from 'lucide-react'
import './Select.css'
import './ColorPicker.css'

const RECENT_KEY = 'category-custom-colors-v1'
const POP_W = 288
const POP_H = 420
const GAP = 8
const EDGE = 12

const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b)

/* ── Konversi warna ── */
function normHex(s) {
  let h = String(s || '').trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map(c => c + c).join('')
  return /^[0-9a-f]{6}$/i.test(h) ? '#' + h.toLowerCase() : null
}

function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

function hsvToHex({ h, s, v }) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) }
  const to = x => Math.round(x * 255).toString(16).padStart(2, '0')
  return '#' + to(f(5)) + to(f(3)) + to(f(1))
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

function loadRecent() {
  try {
    const a = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(a) ? a.map(normHex).filter(Boolean).slice(0, 6) : []
  } catch { return [] }
}
function saveRecent(hex) {
  try {
    const next = [hex, ...loadRecent().filter(c => c !== hex)].slice(0, 6)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* abaikan */ }
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
 *  value      warna terpilih (hex)
 *  onChange   (hex) => void
 *  colors     daftar warna bawaan
 */
export default function ColorPicker({ value, onChange, colors = [] }) {
  const isPreset = colors.includes(value)
  const [open, setOpen] = useState(false)
  const [hsv, setHsv] = useState({ h: 36, s: 0.79, v: 0.96 })
  const [text, setText] = useState('')
  const [recent, setRecent] = useState([])
  const [pos, setPos] = useState(null)
  const isMobile = useIsMobile()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const dragging = useRef(false)

  const hex = hsvToHex(hsv)
  const dark = luminance(hex) < 0.05
  const canEyedrop = typeof window !== 'undefined' && 'EyeDropper' in window

  function updateHsv(next) {
    setHsv(next)
    setText(hsvToHex(next).slice(1))
  }

  function openMenu() {
    const start = hexToHsv(normHex(value) || '#f5a623')
    setHsv(start)
    setText(hsvToHex(start).slice(1))
    setRecent(loadRecent())
    setOpen(true)
  }

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  function apply() {
    const n = normHex(text) || hex
    saveRecent(n)
    if (n !== normHex(value)) onChange(n)
    close()
  }

  function onHexInput(e) {
    const t = e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6)
    setText(t)
    const n = normHex(t)
    if (n) {
      setHsv(prev => {
        const nx = hexToHsv(n)
        if (nx.s === 0 || nx.v === 0) nx.h = prev.h // pertahankan rona untuk abu-abu / hitam
        return nx
      })
    }
  }

  async function eyedrop() {
    try {
      const r = await new window.EyeDropper().open()
      const n = normHex(r.sRGBHex)
      if (n) updateHsv(hexToHsv(n))
    } catch { /* dibatalkan */ }
  }

  /* ── Geser area & slider ── */
  const dragProps = onPoint => ({
    onPointerDown: e => {
      dragging.current = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
      onPoint(e)
    },
    onPointerMove: e => { if (dragging.current) onPoint(e) },
    onPointerUp: () => { dragging.current = false },
    onPointerCancel: () => { dragging.current = false },
  })

  const pointSV = e => {
    const r = e.currentTarget.getBoundingClientRect()
    updateHsv({
      h: hsv.h,
      s: clamp((e.clientX - r.left) / r.width),
      v: 1 - clamp((e.clientY - r.top) / r.height),
    })
  }
  const pointHue = e => {
    const r = e.currentTarget.getBoundingClientRect()
    updateHsv({ ...hsv, h: clamp((e.clientX - r.left) / r.width) * 360 })
  }

  function svKey(e) {
    const st = e.shiftKey ? 0.1 : 0.02
    let { s, v } = hsv
    if (e.key === 'ArrowLeft') s -= st
    else if (e.key === 'ArrowRight') s += st
    else if (e.key === 'ArrowUp') v += st
    else if (e.key === 'ArrowDown') v -= st
    else return
    e.preventDefault()
    updateHsv({ ...hsv, s: clamp(s), v: clamp(v) })
  }
  function hueKey(e) {
    const st = e.shiftKey ? 10 : 2
    let h = hsv.h
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') h -= st
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') h += st
    else return
    e.preventDefault()
    updateHsv({ ...hsv, h: (h + 360) % 360 })
  }

  /* ── Posisi popover (desktop) ── */
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
      maxHeight: Math.max(260, up ? above : below),
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
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
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

  const hueColor = `hsl(${hsv.h} 100% 50%)`

  const body = (
    <div className="cp-body">
      <div
        className="cp-sv"
        role="slider"
        tabIndex={0}
        aria-label="Kecerahan dan saturasi"
        aria-valuetext={hex}
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueColor}` }}
        onKeyDown={svKey}
        {...dragProps(pointSV)}
      >
        <span className="cp-thumb" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
      </div>

      <div
        className="cp-hue"
        role="slider"
        tabIndex={0}
        aria-label="Rona warna"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onKeyDown={hueKey}
        {...dragProps(pointHue)}
      >
        <span className="cp-thumb" style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }} />
      </div>

      <div className="cp-field">
        <div className="cp-preview" style={{ background: `${hex}20` }}>
          <Tag size={17} style={{ color: hex }} />
        </div>
        <label className="cp-hexbox">
          <span>#</span>
          <input
            value={text}
            onChange={onHexInput}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply() } }}
            maxLength={6}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Kode hex warna"
            placeholder="f5a623"
          />
        </label>
        {canEyedrop && (
          <button type="button" className="btn btn-icon btn-ghost cp-eye" onClick={eyedrop} title="Ambil warna dari layar" aria-label="Ambil warna dari layar">
            <Pipette size={15} />
          </button>
        )}
      </div>

      {dark && (
        <div className="cp-warn"><AlertTriangle size={13} /> Warna sangat gelap, kurang terlihat di tema gelap.</div>
      )}

      {recent.length > 0 && (
        <div className="cp-recent">
          <div className="cp-recent-label">Terakhir dipakai</div>
          <div className="cp-recent-row">
            {recent.map(c => (
              <button
                key={c} type="button"
                className={`cp-mini${c === hex ? ' is-sel' : ''}`}
                style={{ background: c }}
                aria-label={`Pakai ${c}`}
                onClick={() => updateHsv(hexToHsv(c))}
              />
            ))}
          </div>
        </div>
      )}

      <div className="cp-actions">
        <button type="button" className="btn btn-ghost" onClick={() => close()}>Batal</button>
        <button type="button" className="btn btn-primary" onClick={apply}>Pakai Warna</button>
      </div>
    </div>
  )

  return (
    <>
      <div className="cp-row">
        {colors.map(c => (
          <button
            key={c} type="button"
            className={`pick-opt cp-sw${value === c ? ' is-sel' : ''}`}
            style={{ background: c }}
            aria-label={`Warna ${c}`}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
          />
        ))}

        <button
          ref={triggerRef}
          type="button"
          className={`pick-opt cp-sw cp-sw-custom${!isPreset ? ' is-sel has-color' : ''}${open ? ' is-open' : ''}`}
          style={!isPreset ? { background: value } : undefined}
          aria-label="Warna kustom"
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Warna kustom"
          onClick={() => (open ? close(false) : openMenu())}
        >
          {isPreset && <span className="cp-plus"><Plus size={12} strokeWidth={3} /></span>}
        </button>
      </div>

      {open && createPortal(
        isMobile ? (
          <div className="sel-layer">
            <div className="sel-backdrop" onClick={() => close()} />
            <div ref={panelRef} className="sel-sheet cp-sheet" role="dialog" aria-label="Warna kustom" onMouseDown={e => { if (!e.target.closest('input')) e.preventDefault() }}>
              <div className="sel-grabber" />
              <div className="sel-sheet-title">Warna Kustom</div>
              {body}
            </div>
          </div>
        ) : (
          <div ref={panelRef} className="sel-pop cp-pop" role="dialog" aria-label="Warna kustom"
            style={pos || { visibility: 'hidden' }} onMouseDown={e => { if (!e.target.closest('input')) e.preventDefault() }}>
            {body}
          </div>
        ),
        document.body
      )}
    </>
  )
}