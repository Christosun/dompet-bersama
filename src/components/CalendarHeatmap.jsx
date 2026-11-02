import { useState, useRef, useEffect } from 'react'
import { formatRupiah } from '../lib/utils'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const WIDE_BREAKPOINT = 560 // lebar container (px) di atas ini dianggap "lebar"
const WIDE_CELL_HEIGHT = 60 // tinggi sel saat lebar (sel melebar, tidak membesar jadi kotak raksasa)

const compact = v => v >= 1e6 ? `${+(v / 1e6).toFixed(1)}jt` : v >= 1e3 ? `${Math.round(v / 1e3)}rb` : String(Math.round(v))

export default function CalendarHeatmap({ transactions, month, year }) {
  const wrapRef = useRef(null)
  const pointerType = useRef('mouse') // 'mouse' | 'touch' | 'pen'
  const [activeDay, setActiveDay] = useState(null)
  const [wide, setWide] = useState(false)

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

  // Deteksi lebar container
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setWide(el.clientWidth >= WIDE_BREAKPOINT)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Reset saat bulan berganti
  useEffect(() => { setActiveDay(null) }, [month, year])

  // Tutup saat tap di luar kalender / tekan Escape
  useEffect(() => {
    if (activeDay == null) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setActiveDay(null)
    }
    function onKey(e) { if (e.key === 'Escape') setActiveDay(null) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [activeDay])

  function handleClick(e, day) {
    // Mouse: sudah ditangani hover (e.detail === 0 = klik dari keyboard)
    if (pointerType.current === 'mouse' && e.detail !== 0) return
    setActiveDay(prev => (prev === day ? null : day))
  }

  const activeAmt = activeDay != null ? (dailySpending[activeDay] || 0) : 0
  const activeCount = activeDay != null ? (dailyCount[activeDay] || 0) : 0

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', padding: '3px 0', fontWeight: 500, letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setActiveDay(null) }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const lvl = intensity(day)
          const isToday = day === todayDay
          const isActive = activeDay === day
          const amt = dailySpending[day] || 0
          const textColor = lvl >= 3 ? '#1a0e00' : lvl > 0 ? 'var(--accent)' : 'var(--text-muted)'
          return (
            <button
              key={day}
              type="button"
              onPointerDown={e => { pointerType.current = e.pointerType }}
              onPointerEnter={e => { if (e.pointerType === 'mouse') setActiveDay(day) }}
              onClick={e => handleClick(e, day)}
              aria-label={`${day} ${MONTHS[month - 1]}: ${amt ? formatRupiah(amt) : 'tidak ada pengeluaran'}${isToday ? ' (hari ini)' : ''}`}
              style={{
                position: 'relative',
                ...(wide ? { height: WIDE_CELL_HEIGHT } : { aspectRatio: '1' }),
                padding: 0,
                borderRadius: 6,
                background: BG[lvl],
                border: isActive ? '1.5px solid var(--accent-2)' : '1px solid var(--border)',
                boxShadow: isActive ? '0 0 0 3px var(--accent-dim)' : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                fontSize: wide ? 12 : 10,
                fontFamily: 'var(--font-body)',
                color: textColor,
                fontWeight: isToday ? 700 : 400,
                cursor: 'pointer',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                outline: 'none',
              }}
            >
              <span>{day}</span>
              {wide && amt > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>{compact(amt)}</span>
              )}
              {isToday && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute', bottom: 4, left: '50%', marginLeft: -2,
                    width: 4, height: 4, borderRadius: '50%',
                    background: lvl >= 3 ? '#1a0e00' : 'var(--accent)',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Panel detail: tidak menimpa kalender, jadi tidak ada yang tertutup */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          marginTop: 12, padding: '10px 14px', minHeight: 44,
          background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10,
        }}
        aria-live="polite"
      >
        {activeDay == null ? (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {wide ? 'Arahkan kursor ke tanggal untuk melihat detail' : 'Ketuk tanggal untuk melihat detail'}
          </span>
        ) : (
          <>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-2)' }}>
              {activeDay} {MONTHS[month - 1]} {year}
            </span>
            {activeAmt > 0 ? (
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                <strong style={{ fontWeight: 700 }}>{formatRupiah(activeAmt)}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>{activeCount} transaksi</span>
              </span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tidak ada pengeluaran</span>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rendah</span>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: BG[i], border: '1px solid var(--border)' }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tinggi</span>
      </div>
    </div>
  )
}