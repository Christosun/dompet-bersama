import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah, getInitials, getAvatarColor, formatShortDate, getCurrentMonth, getMonthName } from '../lib/utils'
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import TransactionModal from '../components/TransactionModal'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const TOOLTIP_STYLE = {
  background: '#2a2a35',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: '#f0eff4',
  fontSize: 12,
}

function formatDateHeader(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  // Format tanggal lengkap (tanpa weekday biar tidak dobel)
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)

  if (isToday) return `Hari Ini • ${formattedDate}`
  if (isYesterday) return `Kemarin • ${formattedDate}`

  // Untuk hari lain tetap pakai format lengkap + weekday
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function GroupedTransactions({ transactions, profiles }) {
  // Group by date
  const groups = {}
  transactions.forEach(tx => {
    if (!groups[tx.date]) groups[tx.date] = []
    groups[tx.date].push(tx)
  })

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sortedDates.map(date => {
        const txs = groups[date]
        const dayIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const dayExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
        const dayNet = dayIncome - dayExpense

        return (
          <div key={date} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden'
          }}>
            {/* Date header with daily stats */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 16px',
              background: 'var(--bg-card2)',
              borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {formatDateHeader(date)}
                </span>
                <span style={{
                  fontSize: 11,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 99,
                  padding: '2px 8px',
                  color: 'var(--text-muted)'
                }}>
                  {txs.length} transaksi
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {dayIncome > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--green)' }}>
                    +{formatRupiah(dayIncome)}
                  </span>
                )}
                {dayExpense > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--red)' }}>
                    -{formatRupiah(dayExpense)}
                  </span>
                )}
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: dayNet >= 0 ? 'var(--green)' : 'var(--red)',
                  paddingLeft: 6,
                  borderLeft: '1px solid var(--border)'
                }}>
                  {dayNet >= 0 ? '+' : ''}{formatRupiah(dayNet)}
                </span>
              </div>
            </div>

            {/* Transactions for that date */}
            <div>
              {txs.map((tx, i) => {
                const who = profiles[tx.user_id]
                return (
                  <div
                    key={tx.id}
                    className="tx-item"
                    style={{
                      borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none',
                      borderRadius: 0,
                      padding: '10px 16px'
                    }}
                  >
                    <div className="tx-icon" style={{ background: `${tx.categories?.color || '#6b7280'}20` }}>
                      {tx.categories?.icon || '💰'}
                    </div>
                    <div className="tx-info">
                      <div className="tx-cat">{tx.categories?.name || 'Tidak diketahui'}</div>
                      <div className="tx-note">{tx.note || '—'}</div>
                    </div>
                    <div className="tx-meta">
                      <div className={`tx-amount ${tx.type === 'income' ? 'pos' : 'neg'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                      </div>
                      {who && (
                        <div className="tx-who">
                          <div className="avatar" style={{ width: 16, height: 16, fontSize: 8, background: getAvatarColor(who.name) }}>
                            {getInitials(who.name)}
                          </div>
                          {who.name.split(' ')[0]}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [{ month, year }, setMonthYear] = useState(getCurrentMonth())
  const [transactions, setTransactions] = useState([])
  const [profiles, setProfiles] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [month, year])

  async function loadData() {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: txs }, { data: profs }] = await Promise.all([
      supabase.from('transactions').select('*, categories(name, icon, color)').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*')
    ])

    setTransactions(txs || [])
    const pm = {}
    ;(profs || []).forEach(p => pm[p.id] = p)
    setProfiles(pm)
    setLoading(false)
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpense

  // Pie chart data
  const categoryMap = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const key = t.categories?.name || 'Lainnya'
    categoryMap[key] = (categoryMap[key] || 0) + Number(t.amount)
  })
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)

  const PIE_COLORS = ['#c8a97e', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']

  // Daily trend for bar chart
  const dailyMap = {}
  transactions.forEach(t => {
    dailyMap[t.date] = dailyMap[t.date] || { date: t.date, expense: 0, income: 0 }
    dailyMap[t.date][t.type] += Number(t.amount)
  })
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-10).map(d => ({
    ...d, label: formatShortDate(d.date)
  }))

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

  // Show max 5 recent dates on dashboard
  const allDates = [...new Set(transactions.map(t => t.date))].sort((a, b) => b.localeCompare(a))
  const recentDates = allDates.slice(0, 5)
  const recentTransactions = transactions.filter(t => recentDates.includes(t.date))

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Selamat datang, {profile?.name?.split(' ')[0]} 👋</h1>
          <p className="page-sub">Ringkasan keuangan bersama bulan ini</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={16} />
          Tambah
        </button>
      </div>

      {/* Month Navigator */}
      <div className="month-nav" style={{ marginBottom: 24 }}>
        <button className="month-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="month-name">{getMonthName(month, year)}</span>
        <button className="month-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">💰 Saldo Bulan Ini</div>
          <div className={`stat-value ${balance >= 0 ? 'green' : 'red'}`}>{formatRupiah(balance)}</div>
          <div className="stat-sub">{balance >= 0 ? 'Surplus' : 'Defisit'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><span style={{color:'var(--green)'}}>↑</span> Pemasukan</div>
          <div className="stat-value green">{formatRupiah(totalIncome)}</div>
          <div className="stat-sub">{transactions.filter(t => t.type === 'income').length} transaksi</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><span style={{color:'var(--red)'}}>↓</span> Pengeluaran</div>
          <div className="stat-value red">{formatRupiah(totalExpense)}</div>
          <div className="stat-sub">{transactions.filter(t => t.type === 'expense').length} transaksi</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📊 Rata-rata/Hari</div>
          <div className="stat-value gold">{formatRupiah(Math.round(totalExpense / new Date(year, month, 0).getDate()))}</div>
          <div className="stat-sub">Pengeluaran harian</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title">Tren Harian</div>
          {dailyData.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><div className="icon" style={{ fontSize: 32 }}>📈</div><p>Belum ada data</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => v >= 1000000 ? `${v/1000000}jt` : `${v/1000}rb`} />
                <Tooltip
                  formatter={(v) => formatRupiah(v)}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: '#f0eff4' }}
                  labelStyle={{ color: '#c8a97e', fontWeight: 600 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="income" name="Pemasukan" fill="var(--green)" radius={[4,4,0,0]} opacity={0.8} />
                <Bar dataKey="expense" name="Pengeluaran" fill="var(--accent)" radius={[4,4,0,0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="section-title">Pengeluaran per Kategori</div>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><div className="icon" style={{ fontSize: 32 }}>🥧</div><p>Belum ada pengeluaran</p></div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <PieChart width={140} height={140}>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => formatRupiah(v)}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: '#f0eff4' }}
                  labelStyle={{ color: '#c8a97e', fontWeight: 600 }}
                />
              </PieChart>
              <div style={{ flex: 1 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div className="cat-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ fontSize: 12, color: 'var(--text-sub)', flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRupiah(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions — grouped by date */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-title" style={{ margin: 0 }}>Transaksi Terakhir</div>
        <a href="/transactions" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Lihat semua →</a>
      </div>

      {loading ? <div className="spinner" /> : recentTransactions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">💸</div>
            <h3>Belum ada transaksi</h3>
            <p>Mulai catat pengeluaran atau pemasukan</p>
          </div>
        </div>
      ) : (
        <GroupedTransactions transactions={recentTransactions} profiles={profiles} />
      )}

      {showModal && <TransactionModal onClose={() => setShowModal(false)} onSaved={loadData} />}
    </div>
  )
}