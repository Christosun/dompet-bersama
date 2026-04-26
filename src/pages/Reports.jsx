import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah, getCurrentMonth, getMonthName } from '../lib/utils'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, ReferenceLine, Area, AreaChart, ComposedChart
} from 'recharts'

const PIE_COLORS = ['#c8a97e','#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#ef4444','#06b6d4','#84cc16','#e879f9']

const TOOLTIP_STYLE = {
  background: '#1c1c22',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#f0eff4',
  fontSize: 12,
  padding: '10px 14px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
}

// Helper: get start/end date strings for a given month/year
function monthRange(month, year) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(year, month, 0).toISOString().split('T')[0]
  return { start, end }
}

// Helper: subtract N months
function subtractMonths(month, year, n) {
  let m = month - n
  let y = year
  while (m <= 0) { m += 12; y-- }
  return { month: m, year: y }
}

// Custom dot for the current month line
function ActiveDot(props) {
  const { cx, cy, value } = props
  if (!value && value !== 0) return null
  return <circle cx={cx} cy={cy} r={4} fill="#c8a97e" stroke="#0f0f11" strokeWidth={2} />
}

// Custom dot for avg line — subtle
function AvgDot(props) {
  const { cx, cy, value } = props
  if (!value && value !== 0) return null
  return <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.3)" stroke="none" />
}

// Custom Tooltip for the cumulative chart
function CumulativeTooltip({ active, payload, label, avgLabel }) {
  if (!active || !payload?.length) return null

  const current = payload.find(p => p.dataKey === 'current')
  const avg = payload.find(p => p.dataKey === 'avg')

  if (!current && !avg) return null

  const diff = current?.value != null && avg?.value != null
    ? current.value - avg.value
    : null

  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 200 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Hari ke-{label}
      </div>
      {current?.value != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c8a97e' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c8a97e', display: 'inline-block' }} />
            Bulan ini
          </span>
          <span style={{ fontWeight: 500, color: '#f0eff4' }}>{formatRupiah(current.value)}</span>
        </div>
      )}
      {avg?.value != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: diff != null ? 8 : 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.45)' }}>
            <span style={{ width: 8, height: 2, background: 'rgba(255,255,255,0.45)', display: 'inline-block', borderRadius: 2 }} />
            Rata-rata 3 bln
          </span>
          <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>{formatRupiah(avg.value)}</span>
        </div>
      )}
      {diff != null && (
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Selisih</span>
          <span style={{
            fontWeight: 600,
            fontSize: 13,
            color: diff > 0 ? '#f87171' : '#4ade80'
          }}>
            {diff > 0 ? '+' : ''}{formatRupiah(diff)}
          </span>
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const [{ month, year }, setMonthYear] = useState(getCurrentMonth())
  const [transactions, setTransactions] = useState([])
  const [prevMonthsData, setPrevMonthsData] = useState([[], [], []])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [month, year])

  async function loadData() {
    setLoading(true)
    const { start, end } = monthRange(month, year)

    // Fetch current month + 3 previous months in parallel
    const prev1 = subtractMonths(month, year, 1)
    const prev2 = subtractMonths(month, year, 2)
    const prev3 = subtractMonths(month, year, 3)

    const [
      { data: txs },
      { data: profs },
      { data: p1 },
      { data: p2 },
      { data: p3 },
    ] = await Promise.all([
      supabase.from('transactions').select('*, categories(name, icon, color)').gte('date', start).lte('date', end).order('date'),
      supabase.from('profiles').select('*'),
      supabase.from('transactions').select('date, amount, type').eq('type', 'expense')
        .gte('date', monthRange(prev1.month, prev1.year).start)
        .lte('date', monthRange(prev1.month, prev1.year).end),
      supabase.from('transactions').select('date, amount, type').eq('type', 'expense')
        .gte('date', monthRange(prev2.month, prev2.year).start)
        .lte('date', monthRange(prev2.month, prev2.year).end),
      supabase.from('transactions').select('date, amount, type').eq('type', 'expense')
        .gte('date', monthRange(prev3.month, prev3.year).start)
        .lte('date', monthRange(prev3.month, prev3.year).end),
    ])

    const pm = {}
    ;(profs || []).forEach(p => pm[p.id] = p)
    setProfiles(pm)
    setTransactions(txs || [])
    setPrevMonthsData([p1 || [], p2 || [], p3 || []])
    setLoading(false)
  }

  function prevMonth() {
    setMonthYear(({ month, year }) => month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year })
  }
  function nextMonth() {
    const now = getCurrentMonth()
    setMonthYear(({ month, year }) => {
      if (year === now.year && month === now.month) return { month, year }
      return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year }
    })
  }

  // ── Derived stats ──────────────────────────────────────────
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  // Category breakdown for pie
  const catMap = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const key = t.categories?.name || 'Lainnya'
    catMap[key] = (catMap[key] || 0) + Number(t.amount)
  })
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // Daily activity
  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyMap = {}
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    dailyMap[key] = { date: d, expense: 0, income: 0 }
  }
  transactions.forEach(t => { if (dailyMap[t.date]) dailyMap[t.date][t.type] += Number(t.amount) })
  const dailyData = Object.values(dailyMap)

  // ── Cumulative comparison chart ────────────────────────────
  // Build cumulative for current month day-by-day
  const currentCumByDay = {}
  let runningCurrent = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    runningCurrent += (dailyMap[key]?.expense || 0)
    currentCumByDay[d] = runningCurrent
  }

  // Build cumulative per day for each of the 3 previous months
  const prevCumsByDay = prevMonthsData.map((txArr, idx) => {
    const prevM = subtractMonths(month, year, idx + 1)
    const daysInPrevMonth = new Date(prevM.year, prevM.month, 0).getDate()

    // daily expense map for that month
    const dm = {}
    for (let d = 1; d <= daysInPrevMonth; d++) {
      const key = `${prevM.year}-${String(prevM.month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      dm[d] = 0
    }
    txArr.forEach(t => {
      const day = parseInt(t.date.split('-')[2])
      dm[day] = (dm[day] || 0) + Number(t.amount)
    })

    // cumulative
    const cum = {}
    let running = 0
    for (let d = 1; d <= daysInPrevMonth; d++) {
      running += (dm[d] || 0)
      cum[d] = running
    }
    return { cum, totalDays: daysInPrevMonth, total: running }
  })

  // For each day 1..daysInMonth, compute average cumulative across prev months
  // We normalize to percentage-of-month to handle months with different day counts
  const today = new Date()
  const isCurrentMonth = month === (today.getMonth() + 1) && year === today.getFullYear()
  const todayDay = isCurrentMonth ? today.getDate() : daysInMonth

  const cumulativeChartData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const pct = d / daysInMonth // fraction of current month

    // For each prev month, interpolate their cumulative at the equivalent fraction
    const avgValues = prevCumsByDay
      .filter(p => p.total > 0) // only include months with data
      .map(p => {
        const equivalentDay = Math.round(pct * p.totalDays)
        const clampedDay = Math.min(Math.max(equivalentDay, 1), p.totalDays)
        return p.cum[clampedDay] || 0
      })

    const avgCum = avgValues.length > 0
      ? Math.round(avgValues.reduce((s, v) => s + v, 0) / avgValues.length)
      : null

    const dataPoint = {
      day: d,
      avg: avgCum,
      // Only plot current if we've reached that day
      current: d <= todayDay ? Math.round(currentCumByDay[d] || 0) : null,
    }
    cumulativeChartData.push(dataPoint)
  }

  // ── Insight: are we over or under vs avg? ─────────────────
  const lastAvailableDay = Math.min(todayDay, daysInMonth)
  const currentAtToday = currentCumByDay[lastAvailableDay] || 0
  const avgAtToday = cumulativeChartData[lastAvailableDay - 1]?.avg

  const hasAvgData = prevMonthsData.some(arr => arr.length > 0)
  const diffVsAvg = hasAvgData && avgAtToday != null ? currentAtToday - avgAtToday : null
  const diffPct = hasAvgData && avgAtToday ? Math.abs(Math.round((diffVsAvg / avgAtToday) * 100)) : null

  // Previous month totals for avg label
  const avgMonthNames = [1, 2, 3].map(n => {
    const p = subtractMonths(month, year, n)
    return getMonthName(p.month, p.year)
  })

  // Per person
  const personMap = {}
  transactions.forEach(t => {
    const name = profiles[t.user_id]?.name || 'Unknown'
    personMap[name] = personMap[name] || { name, expense: 0, income: 0, count: 0 }
    personMap[name][t.type] += Number(t.amount)
    personMap[name].count++
  })
  const personData = Object.values(personMap)

  // Top 5 expenses
  const topExpenses = [...transactions].filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Laporan</h1>
        <p className="page-sub">Analisis keuangan rumah tangga secara visual</p>
      </div>

      <div className="month-nav" style={{ marginBottom: 24 }}>
        <button className="month-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="month-name">{getMonthName(month, year)}</span>
        <button className="month-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Summary row */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Pemasukan</div>
              <div className="stat-value green">{formatRupiah(totalIncome)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pengeluaran</div>
              <div className="stat-value red">{formatRupiah(totalExpense)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Selisih</div>
              <div className={`stat-value ${totalIncome - totalExpense >= 0 ? 'green' : 'red'}`}>{formatRupiah(totalIncome - totalExpense)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Transaksi</div>
              <div className="stat-value gold">{transactions.length}</div>
            </div>
          </div>

          {/* Daily bar + pie */}
          <div className="grid-2">
            <div className="card">
              <div className="section-title">Aktivitas Harian</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval={4} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={v => v >= 1000000 ? `${v/1000000}jt` : `${v/1000}rb`} />
                  <Tooltip
                    formatter={v => formatRupiah(v)}
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: '#f0eff4' }}
                    labelStyle={{ color: '#c8a97e', fontWeight: 600 }}
                    labelFormatter={v => `Hari ke-${v}`}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="income" name="Pemasukan" fill="var(--green)" radius={[3,3,0,0]} opacity={0.8} />
                  <Bar dataKey="expense" name="Pengeluaran" fill="var(--accent)" radius={[3,3,0,0]} opacity={0.8} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="section-title">Komposisi Pengeluaran</div>
              {pieData.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}><div className="icon">🥧</div><p>Belum ada pengeluaran</p></div>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <PieChart width={150} height={150}>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => formatRupiah(v)} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#f0eff4' }} labelStyle={{ color: '#c8a97e', fontWeight: 600 }} />
                  </PieChart>
                  <div style={{ flex: 1 }}>
                    {pieData.slice(0, 7).map((d, i) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <div className="cat-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span style={{ fontSize: 11, color: 'var(--text-sub)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{Math.round(d.value / totalExpense * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Cumulative Comparison Card ── */}
          <div className="card" style={{ padding: '24px 24px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div className="section-title" style={{ marginBottom: 4 }}>Akumulasi Pengeluaran</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Dibandingkan rata-rata {avgMonthNames.join(', ')}
                </p>
              </div>

              {/* Insight badge */}
              {diffVsAvg != null && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 99,
                  background: diffVsAvg > 0 ? 'rgba(248,113,113,0.1)' : diffVsAvg < 0 ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${diffVsAvg > 0 ? 'rgba(248,113,113,0.25)' : diffVsAvg < 0 ? 'rgba(74,222,128,0.25)' : 'var(--border)'}`,
                  flexShrink: 0,
                }}>
                  {diffVsAvg > 0
                    ? <TrendingUp size={14} color="#f87171" />
                    : diffVsAvg < 0
                    ? <TrendingDown size={14} color="#4ade80" />
                    : <Minus size={14} color="var(--text-muted)" />
                  }
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: diffVsAvg > 0 ? '#f87171' : diffVsAvg < 0 ? '#4ade80' : 'var(--text-muted)'
                  }}>
                    {diffVsAvg > 0 ? '+' : ''}{formatRupiah(diffVsAvg)}
                  </span>
                  {diffPct != null && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      ({diffVsAvg > 0 ? '+' : '-'}{diffPct}%)
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs rata-rata</span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 24, height: 2.5, borderRadius: 2, background: '#c8a97e' }} />
                <span style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 500 }}>Bulan ini</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 24, height: 0,
                  borderTop: '2px dashed rgba(255,255,255,0.3)',
                }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rata-rata 3 bulan lalu</span>
              </div>
              {isCurrentMonth && todayDay < daysInMonth && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 'auto' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Garis putus = proyeksi</span>
                </div>
              )}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={cumulativeChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8a97e" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#c8a97e" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v % 5 === 0 || v === 1 ? v : ''}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${Math.round(v/1000)}rb` : v}
                  width={48}
                />

                <Tooltip content={<CumulativeTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />

                {/* Today reference line */}
                {isCurrentMonth && todayDay < daysInMonth && (
                  <ReferenceLine
                    x={todayDay}
                    stroke="rgba(255,255,255,0.15)"
                    strokeDasharray="4 3"
                    label={{ value: 'Hari ini', position: 'insideTopRight', fontSize: 10, fill: 'var(--text-muted)' }}
                  />
                )}

                {/* Average line (dashed, subtle) */}
                {hasAvgData && (
                  <Line
                    type="monotone"
                    dataKey="avg"
                    name="Rata-rata 3 bln"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 3, fill: 'rgba(255,255,255,0.5)', stroke: 'none' }}
                    connectNulls
                  />
                )}

                {/* Area fill under current line */}
                <Area
                  type="monotone"
                  dataKey="current"
                  fill="url(#currentGrad)"
                  stroke="none"
                  connectNulls={false}
                />

                {/* Current month line */}
                <Line
                  type="monotone"
                  dataKey="current"
                  name="Bulan ini"
                  stroke="#c8a97e"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#c8a97e', stroke: '#0f0f11', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Bottom context row */}
            {hasAvgData && (
              <div style={{
                display: 'flex',
                gap: 0,
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--border)',
              }}>
                {[0, 1, 2].map(idx => {
                  const p = subtractMonths(month, year, idx + 1)
                  const total = prevCumsByDay[idx]?.total || 0
                  return (
                    <div key={idx} style={{
                      flex: 1,
                      padding: '0 16px',
                      borderRight: idx < 2 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {getMonthName(p.month, p.year)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-sub)' }}>
                        {formatRupiah(total)}
                      </div>
                    </div>
                  )
                })}
                <div style={{ flex: 1, padding: '0 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Rata-rata/bulan</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)' }}>
                    {formatRupiah(Math.round(
                      prevCumsByDay.filter(p => p.total > 0).reduce((s, p) => s + p.total, 0) /
                      Math.max(prevCumsByDay.filter(p => p.total > 0).length, 1)
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!hasAvgData && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-card2)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                💡 Perbandingan akan muncul setelah ada data dari 3 bulan sebelumnya.
              </div>
            )}
          </div>

          {/* Per person */}
          {personData.length > 0 && (
            <div className="card">
              <div className="section-title">Kontribusi per Orang</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {personData.map((p, i) => (
                  <div key={p.name} style={{ padding: '14px 16px', background: 'var(--bg-card2)', borderRadius: 12, borderLeft: `3px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}>
                    <div style={{ fontWeight: 500, marginBottom: 8, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Pengeluaran:</span><span style={{ color: 'var(--red)' }}>{formatRupiah(p.expense)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Pemasukan:</span><span style={{ color: 'var(--green)' }}>{formatRupiah(p.income)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{p.count} transaksi</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top expenses */}
          {topExpenses.length > 0 && (
            <div className="card">
              <div className="section-title">Pengeluaran Terbesar</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {topExpenses.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < topExpenses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 18 }}>{t.categories?.icon || '💰'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.categories?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.note || t.date} · {profiles[t.user_id]?.name || ''}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>{formatRupiah(t.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}