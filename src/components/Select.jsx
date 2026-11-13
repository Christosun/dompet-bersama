import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import './Select.css'

const MAX_H = 288
const ROW_H = 40
const GAP = 6
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
 *  value, onChange(value)
 *  options      [{ value, label, icon?: ReactNode, group?: string }]
 *  placeholder  teks saat belum ada pilihan
 *  title        judul bottom sheet di HP (default: placeholder)
 *  leftIcon     komponen ikon lucide di kiri (opsional)
 *  size         'md' (default, 48px) | 'sm' (36px)
 *  required     validasi form seperti <select required>
 *  disabled, id, className, style
 */
export default function Select({
  value, onChange, options = [], placeholder = 'Pilih...', title,
  leftIcon: LeftIcon, size = 'md', required = false, disabled = false,
  id, className = '', style,
}) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const [pos, setPos] = useState(null)
  const isMobile = useIsMobile()
  const uid = useId()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const listRef = useRef(null)
  const optionsRef = useRef(options)
  const fromKey = useRef(false)
  const typeBuf = useRef({ s: '', t: 0 })
  const [picked, setPicked] = useState(-1)   // opsi yang baru diketuk (sebelum panel menutup)
  const [flash, setFlash] = useState(false)  // kilau di trigger setelah nilai berubah
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  optionsRef.current = options

  const selIndex = options.findIndex(o => o.value === value)
  const selected = selIndex >= 0 ? options[selIndex] : null

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  function openMenu() {
    if (disabled) return
    setHi(selIndex >= 0 ? selIndex : 0)
    setOpen(true)
  }

  function choose(i) {
    const o = options[i]
    if (!o || picked >= 0) return
    setPicked(i)
    timers.current.push(setTimeout(() => {
      setPicked(-1)
      close()
      if (o.value !== value) {
        onChange(o.value)
        setFlash(true)
        timers.current.push(setTimeout(() => setFlash(false), 700))
      }
    }, 130))
  }

  /* ── Posisi popover (desktop) ── */
  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const opts = optionsRef.current
    const r = t.getBoundingClientRect()
    const vh = window.innerHeight, vw = window.innerWidth
    const below = vh - r.bottom - EDGE - GAP
    const above = r.top - EDGE - GAP
    const groups = new Set(opts.map(o => o.group).filter(Boolean)).size
    const want = Math.min(MAX_H, opts.length * ROW_H + groups * 28 + 12)
    const up = below < want && above > below
    const width = Math.max(r.width, 200)
    const left = Math.max(EDGE, Math.min(r.left, vw - width - EDGE))
    setPos({
      left, width,
      maxHeight: Math.max(120, Math.min(MAX_H, up ? above : below)),
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

  /* ── Tutup saat klik di luar (desktop). Di HP ditangani backdrop ── */
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

  /* ── Tengahkan opsi terpilih saat dibuka ── */
  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      const list = listRef.current
      const el = list?.querySelector('[data-sel="true"]')
      if (list && el) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2
    })
    return () => cancelAnimationFrame(raf)
  }, [open, isMobile])

  /* ── Ikuti highlight saat navigasi keyboard ── */
  useEffect(() => {
    if (!open || !fromKey.current) return
    fromKey.current = false
    listRef.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [hi, open])

  function onKeyDown(e) {
    if (disabled) return
    const n = options.length
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu() }
      return
    }
    const move = i => { fromKey.current = true; setHi(Math.max(0, Math.min(n - 1, i))) }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(hi + 1); break
      case 'ArrowUp': e.preventDefault(); move(hi - 1); break
      case 'Home': e.preventDefault(); move(0); break
      case 'End': e.preventDefault(); move(n - 1); break
      case 'Enter':
      case ' ': e.preventDefault(); if (hi >= 0) choose(hi); break
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); break
      case 'Tab': setOpen(false); break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const tb = typeBuf.current, now = Date.now()
          tb.s = now - tb.t > 600 ? e.key.toLowerCase() : tb.s + e.key.toLowerCase()
          tb.t = now
          const idx = options.findIndex(o => String(o.label).toLowerCase().startsWith(tb.s))
          if (idx >= 0) move(idx)
        }
    }
  }

  const list = (
    <ul ref={listRef} id={uid} role="listbox" className="sel-list">
      {options.length === 0 && <li className="sel-empty">Tidak ada pilihan</li>}
      {options.map((o, i) => {
        const showGroup = o.group && o.group !== options[i - 1]?.group
        const isSel = picked >= 0 ? i === picked : i === selIndex
        return (
          <Fragment key={`${o.group || ''}-${o.value}`}>
            {showGroup && <li role="presentation" className="sel-group">{o.group}</li>}
            <li
              role="option"
              id={`${uid}-${i}`}
              data-i={i}
              data-sel={isSel}
              aria-selected={isSel}
              className={`sel-opt${isSel ? ' is-sel' : ''}${i === hi ? ' is-hi' : ''}${i === picked ? ' is-pick' : ''}`}
              onMouseEnter={() => setHi(i)}
              onClick={() => choose(i)}
            >
              {o.icon && <span className="sel-opt-ico">{o.icon}</span>}
              <span className="sel-opt-label">{o.label}</span>
              {isSel && <Check size={16} className="sel-check" />}
            </li>
          </Fragment>
        )
      })}
    </ul>
  )

  return (
    <>
      <div className={`sel ${className}`} style={style}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={`sel-trigger${size === 'sm' ? ' sm' : ''}${open ? ' is-open' : ''}${LeftIcon ? ' has-left' : ''}${selected ? '' : ' is-placeholder'}${flash ? ' is-flash' : ''}`}disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? uid : undefined}
          aria-activedescendant={open && hi >= 0 ? `${uid}-${hi}` : undefined}
          onClick={() => (open ? close(false) : openMenu())}
          onKeyDown={onKeyDown}
        >
          {LeftIcon && <LeftIcon size={17} className="sel-left" />}
          {selected?.icon && <span className="sel-opt-ico">{selected.icon}</span>}
          <span className="sel-value">{selected ? selected.label : placeholder}</span>
          <ChevronDown size={size === 'sm' ? 14 : 16} className="sel-chev" />
        </button>

        {/* Agar atribut `required` pada form tetap bekerja */}
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
            <div ref={panelRef} className="sel-sheet" onMouseDown={e => e.preventDefault()}>
              <div className="sel-grabber" />
              <div className="sel-sheet-title">{title || placeholder}</div>
              {list}
            </div>
          </div>
        ) : (
          <div
            ref={panelRef}
            className="sel-pop"
            style={pos || { visibility: 'hidden' }}
            onMouseDown={e => e.preventDefault()}
          >
            {list}
          </div>
        ),
        document.body
      )}
    </>
  )
}