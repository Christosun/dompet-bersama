import { useState, useRef, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, Sector } from 'recharts'
import { formatRupiah } from '../lib/utils'
import './CategoryDonut.css'

const DEFAULT_COLORS = ['#f5a623', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#34d399', '#f87171', '#06b6d4', '#fbbf24', '#e879f9']

const SIZE = 176
const INNER = 56
const OUTER = 80
const POP = 4 // seberapa menonjol irisan yang aktif

const pctText = (v, total) => {
  const p = total > 0 ? (v / total) * 100 : 0
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`
}

/**
 * Donut chart pengeluaran per kategori.
 *
 * Props:
 *  data      [{ name, value }]
 *  colors    daftar warna (opsional)
 *  maxItems  jumlah maksimum irisan; sisanya digabung jadi "Lainnya (n)"
 *
 * Interaksi:
 *  - Desktop: arahkan kursor ke irisan ATAU baris legenda. Klik untuk mengunci.
 *  - Mobile: ketuk irisan atau baris legenda. Ketuk lagi / ketuk di luar untuk melepas.
 *  - Detail tampil di tengah donut, tidak ada popup yang menutupi data lain.
 */
export default function CategoryDonut({ data, colors = DEFAULT_COLORS, maxItems = 8 }) {
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const rootRef = useRef(null)
  const pointerType = useRef('mouse')

  const { items, total } = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value)
    let list = sorted
    if (sorted.length > maxItems) {
      const head = sorted.slice(0, maxItems - 1)
      const rest = sorted.slice(maxItems - 1)
      list = [...head, { name: `Lainnya (${rest.length})`, value: rest.reduce((s, r) => s + r.value, 0) }]
    }
    return {
      items: list.map((d, i) => ({ ...d, color: colors[i % colors.length] })),
      total: list.reduce((s, d) => s + d.value, 0),
    }
  }, [data, maxItems, colors])

  // Reset pilihan kalau data berubah (misalnya ganti bulan)
  useEffect(() => { setHover(null); setPinned(null) }, [data])

  // Lepas kunci saat tap di luar komponen / tekan Escape
  useEffect(() => {
    if (pinned == null) return
    const onDown = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setPinned(null) }
    const onKey = e => { if (e.key === 'Escape') setPinned(null) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  if (!items.length) return null

  const raw = hover ?? pinned
  const active = raw != null && raw < items.length ? raw : null
  const current = active != null ? items[active] : null

  // Hover hanya berlaku untuk mouse. Di layar sentuh, browser meniru mouseenter
  // setelah tap dan tidak pernah memanggil mouseleave, jadi kita abaikan.
  const enter = i => { if (pointerType.current === 'mouse') setHover(i) }
  const leave = () => { if (pointerType.current === 'mouse') setHover(null) }
  const toggle = i => setPinned(p => (p === i ? null : i))

  const renderActive = p => (
    <Sector
      cx={p.cx} cy={p.cy}
      innerRadius={p.innerRadius} outerRadius={p.outerRadius + POP}
      startAngle={p.startAngle} endAngle={p.endAngle}
      cornerRadius={3} fill={p.fill}
    />
  )

  return (
    <div className="donut" ref={rootRef} onPointerDown={e => { pointerType.current = e.pointerType }}>
      <div className="donut-chart" style={{ width: SIZE, height: SIZE }}>
        <PieChart width={SIZE} height={SIZE}>
          <Pie
            data={items}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="50%"
            innerRadius={INNER} outerRadius={OUTER}
            startAngle={90} endAngle={-270}
            paddingAngle={items.length > 1 ? 2 : 0}
            cornerRadius={3}
            stroke="none"
            isAnimationActive={false}
            activeIndex={active == null ? -1 : active}
            activeShape={renderActive}
            onMouseEnter={(_, i) => enter(i)}
            onMouseLeave={leave}
            onClick={(_, i) => toggle(i)}
          >
            {items.map((d, i) => (
              <Cell
                key={d.name}
                fill={d.color}
                fillOpacity={active == null || active === i ? 1 : 0.3}
                style={{ cursor: 'pointer', outline: 'none', transition: 'fill-opacity 0.15s' }}
              />
            ))}
          </Pie>
        </PieChart>

        <div className="donut-center" aria-live="polite">
          {current ? (
            <>
              <span className="donut-center-label" style={{ color: current.color }}>{current.name}</span>
              <strong className="donut-center-value">{formatRupiah(current.value)}</strong>
              <span className="donut-center-sub">{pctText(current.value, total)} dari total</span>
            </>
          ) : (
            <>
              <span className="donut-center-label">Total</span>
              <strong className="donut-center-value">{formatRupiah(total)}</strong>
              <span className="donut-center-sub">{items.length} kategori</span>
            </>
          )}
        </div>
      </div>

      <ul className="donut-legend">
        {items.map((d, i) => (
          <li key={d.name}>
            <button
              type="button"
              className={`donut-row${active === i ? ' is-active' : ''}${active != null && active !== i ? ' is-dim' : ''}`}
              aria-pressed={pinned === i}
              onPointerEnter={e => { pointerType.current = e.pointerType; enter(i) }}
              onPointerLeave={leave}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => toggle(i)}
            >
              <span className="donut-dot" style={{ background: d.color }} />
              <span className="donut-name">{d.name}</span>
              <span className="donut-amt">{formatRupiah(d.value)}</span>
              <span className="donut-pct">{pctText(d.value, total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}