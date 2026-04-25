import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah, getCurrentMonth, getMonthName } from '../lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'

const PIE_COLORS = ['#c8a97e','#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#ef4444','#06b6d4','#84cc16','#e879f9']

export default function Reports() {
  const [{ month, year }, setMonthYear] = useState(getCurrentMonth())
  const [transactions, setTransactions] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [month, year])

  async function loadData() {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: txs }, { data: profs }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date'),
      supabase.from('profiles').select('*')
    ])

    const pm = {}
    ;(profs || []).forEach(p => pm[p.id] = p)
    setProfiles(pm)
    setTransactions(txs || [])
    setLoading(false)
  }

  // Category breakdown for expenses
  const catMap = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const key = t.categories?.name || 'Lainnya'
    catMap[key] = (catMap[key] || 0) + Number(t.amount)
  })
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // Daily data
  const dailyMap = {}
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    dailyMap[key] = { date: d, expense: 0, income: 0 }
  }
  transactions.forEach(t => {
    if (dailyMap[t.date]) dailyMap[t.date][t.type] += Number(t.amount)
  })
  const dailyData = Object.values(dailyMap)

  // Cumulative spending
  let cum = 0
  const cumulativeData = dailyData.map(d => {
    cum += d.expense
    return { date: d.date, total: cum }
  })

  // Per person breakdown
  const personMap = {}
  transactions.forEach(t => {
    const name = profiles[t.user_id]?.name || 'Unknown'
    personMap[name] = personMap[name] || { name, expense: 0, income: 0, count: 0 }
    personMap[name][t.type] += Number(t.amount)
    personMap[name].count++
  })
  const personData = Object.values(personMap)

  // Top expenses
  const topExpenses = [...transactions].filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

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

  const tooltipStyle = { background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12 }

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
                  <Tooltip formatter={v => formatRupiah(v)} contentStyle={tooltipStyle} />
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
                      <Tooltip formatter={v => formatRupiah(v)} contentStyle={tooltipStyle} />
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

          {/* Cumulative spending line */}
          <div className="card">
            <div className="section-title">Akumulasi Pengeluaran Bulan Ini</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={cumulativeData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : `${v/1000}rb`} />
                <Tooltip formatter={v => formatRupiah(v)} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="total" name="Total Pengeluaran" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topExpenses.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < topExpenses.length - 1 ? '1px solid var(--border)' : 'none' }}>
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
