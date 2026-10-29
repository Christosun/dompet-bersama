import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { formatRupiah } from '../lib/utils'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function CalendarHeatmap({ transactions, month, year }) {
  const wrapRef = useRef(null)
  const tipRef = useRef(null)
  const pointerType = useRef('mouse') // 'mouse' | 'touch' | 'pen'
  const [active, setActive] = useState(null) // { day, amt, count, cx, top, bottom }
  const [tipPos, setTipPos] = useState({ left: 0, top: 0, arrowLeft: 0, below: false })

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const dailySpending = {}
  const dailyCount = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const d = parseInt(t.date.split('-')[2])
    dailySpending[d] = (dailySpending[d] || 0) + Number(t.amount)
    dailyCount[d] = (dailyCount[d] || 0) + 1
  })

  const maxSpend = Math.max(...Object.values(dailySpending), 1)

  function intensity(day) {
    const amt = dailySpending[day] || 0
    if (!amt) return 0
    return Math.ceil((amt / maxSpend) * 4)
  }

  const BG = [
    'var(--bg-card2)',
    'rgba(245,166,35,0.15)',
    'rgba(245,166,35,0.35)',
    'rgba(245,166,35,0.6)',
    'rgba(245,166,35,0.88)',
  ]

  const today = new Date()
  const todayDay = (month === today.getMonth() + 1 && year === today.getFullYear()) ? today.getDate() : 0

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Tutup tooltip jika bulan berganti
  useEffect(() => { setActive(null) }, [month, year])

  // Tutup saat tap di luar kalender / tekan Escape / scroll
  useEffect(() => {
    if (!active) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setActive(null)
    }
    function onKey(e) { if (e.key === 'Escape') setActive(null) }
    function onScroll() { setActive(null) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [active])

  // Hitung posisi tooltip: di atas sel, otomatis di bawah jika tidak muat, dan tidak keluar container
  useLayoutEffect(() => {
    if (!active || !tipRef.current || !wrapRef.current) return
    const tip = tipRef.current.getBoundingClientRect()
    const wrap = wrapRef.current.getBoundingClientRect()
    const GAP = 8
    const PAD = 4

    let left = active.cx - wrap.left - tip.width / 2
    left = Math.min(Math.max(left, PAD), wrap.width - tip.width - PAD)
    const arrowLeft = Math.min(Math.max(active.cx - wrap.left - left, 14), tip.width - 14)

    const spaceAbove = active.top - wrap.top
    const below = spaceAbove < tip.height + GAP + 4
    const top = below
      ? active.bottom - wrap.top + GAP
      : active.top - wrap.top - tip.height - GAP

    setTipPos({ left, top, arrowLeft, below })
  }, [active])

  function buildActive(el, day) {
    const r = el.getBoundingClientRect()
    return {
      day,
      amt: dailySpending[day] || 0,
      count: dailyCount[day] || 0,
      cx: r.left + r.width / 2,
      top: r.top,
      bottom: r.bottom,
    }
  }

  function handleClick(e, day) {
    // Mouse: tooltip sudah diatur lewat hover, jadi klik tidak perlu diproses
    // (e.detail === 0 berarti klik dari keyboard: Enter/Space)
    if (pointerType.current === 'mouse' && e.detail !== 0) return

    const next = buildActive(e.currentTarget, day)
    // Tap tanggal yang sama = tutup, tap tanggal lain = langsung pindah
    setActive(prev => (prev?.day === day ? null : next))
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', padding: '3px 0', fontWeight: 500, letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const lvl = intensity(day)
          const isToday = day === todayDay
          const isActive = active?.day === day
          return (
            <button
              key={day}
              type="button"
              onPointerDown={e => { pointerType.current = e.pointerType }}
              onPointerEnter={e => {
                if (e.pointerType === 'mouse') setActive(buildActive(e.currentTarget, day))
              }}
              onPointerLeave={e => {
                if (e.pointerType === 'mouse') setActive(null)
              }}
              onClick={e => handleClick(e, day)}
              aria-label={`${day} ${MONTHS[month - 1]}: ${dailySpending[day] ? formatRupiah(dailySpending[day]) : 'tidak ada pengeluaran'}`}
              style={{
                aspectRatio: '1',
                padding: 0,
                borderRadius: 5,
                background: BG[lvl],
                border: isActive
                  ? '1.5px solid var(--accent-2)'
                  : isToday ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: isActive ? '0 0 0 3px var(--accent-dim)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10,
                fontFamily: 'var(--font-body)',
                color: lvl >= 3 ? '#1a0e00' : lvl > 0 ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: isToday ? 700 : 400,
                cursor: 'pointer',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.12s',
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
                outline: 'none',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rendah</span>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: BG[i], border: '1px solid var(--border)' }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tinggi</span>
      </div>

      {/* Tooltip */}
      {active && (
        <div
          key={active.day}
          ref={tipRef}
          role="tooltip"
          style={{
            position: 'absolute',
            left: tipPos.left,
            top: tipPos.top,
            zIndex: 50,
            pointerEvents: 'none',
            minWidth: 120,
            padding: '8px 12px',
            background: '#1a1d24',
            border: '1px solid rgba(245,166,35,0.25)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
            animation: 'heatTipIn 0.14s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: 3 }}>
            {active.day} {MONTHS[month - 1]}
          </div>
          {active.amt > 0 ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {formatRupiah(active.amt)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {active.count} transaksi
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tidak ada pengeluaran</div>
          )}

          {/* Panah */}
          <span
            style={{
              position: 'absolute',
              left: tipPos.arrowLeft - 5,
              [tipPos.below ? 'top' : 'bottom']: -5,
              width: 10, height: 10,
              background: '#1a1d24',
              borderRight: tipPos.below ? 'none' : '1px solid rgba(245,166,35,0.25)',
              borderBottom: tipPos.below ? 'none' : '1px solid rgba(245,166,35,0.25)',
              borderLeft: tipPos.below ? '1px solid rgba(245,166,35,0.25)' : 'none',
              borderTop: tipPos.below ? '1px solid rgba(245,166,35,0.25)' : 'none',
              transform: 'rotate(45deg)',
            }}
          />
        </div>
      )}
    </div>
  )
}