import { useState, useEffect, useMemo, useCallback, memo } from 'react'
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
  const formattedDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  if (date.toDateString() === today.toDateString()) return `Hari Ini • ${formattedDate}`
  if (date.toDateString() === yesterday.toDateString()) return `Kemarin • ${formattedDate}`
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

// Memoized transaction row
const TxRow = memo(function TxRow({ tx, who, isLast }) {
  return (
    <div
      className="tx-item"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        borderRadius: 0,
        padding: '10px 16px',
        contain: 'layout style',
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
})

// Memoized date group for dashboard
const DashDateGroup = memo(function DashDateGroup({ date, txs, profiles }) {
  const dayIncome = useMemo(() => txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), [txs])
  const dayExpense = useMemo(() => txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0), [txs])
  const dayNet = dayIncome - dayExpense

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', contain: 'layout' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', background: 'var(--bg-card2)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{formatDateHeader(date)}</span>
          <span style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px', color: 'var(--text-muted)' }}>
            {txs.length} transaksi
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {dayIncome > 0 && <span style={{ fontSize: 12, color: 'var(--green)' }}>+{formatRupiah(dayIncome)}</span>}
          {dayExpense > 0 && <span style={{ fontSize: 12, color: 'var(--red)' }}>-{formatRupiah(dayExpense)}</span>}
          <span style={{ fontSize: 12, fontWeight: 600, color: dayNet >= 0 ? 'var(--green)' : 'var(--red)', paddingLeft: 6, borderLeft: '1px solid var(--border)' }}>
            {dayNet >= 0 ? '+' : ''}{formatRupiah(dayNet)}
          </span>
        </div>
      </div>
      <div>
        {txs.map((tx, i) => (
          <TxRow key={tx.id} tx={tx} who={profiles[tx.user_id]} isLast={i === txs.length - 1} />
        ))}
      </div>
    </div>
  )
})

// Memoized stat card
const StatCard = memo(function StatCard({ label, value, valueClass, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${valueClass}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
})

const PIE_COLORS = ['#c8a97e', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']

export default function Dashboard() {
  const { profile } = useAuth()
  const [{ month, year }, setMonthYear] = useState(getCurrentMonth())
  const [transactions, setTransactions] = useState([])
  const [profiles, setProfiles] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [month, year])

  const loadData = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: txs }, { data: profs }] = await Promise.all([
      supabase.from('transactions')
        .select('*, categories(name, icon, color)')
        .gte('date', startDate).lte('date', endDate)
        .order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name')
    ])

    setTransactions(txs || [])
    const pm = {}
    ;(profs || []).forEach(p => pm[p.id] = p)
    setProfiles(pm)
    setLoading(false)
  }, [month, year])

  const prevMonth = useCallback(() => {
    setMonthYear(({ month, year }) => month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year })
  }, [])

  const nextMonth = useCallback(() => {
    const now = getCurrentMonth()
    setMonthYear(({ month, year }) => {
      if (year === now.year && month === now.month) return { month, year }
      return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year }
    })
  }, [])

  // All derived values memoized
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const exp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp }
  }, [transactions])

  const pieData = useMemo(() => {
    const categoryMap = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const key = t.categories?.name || 'Lainnya'
      categoryMap[key] = (categoryMap[key] || 0) + Number(t.amount)
    })
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [transactions])

  const dailyData = useMemo(() => {
    const dailyMap = {}
    transactions.forEach(t => {
      dailyMap[t.date] = dailyMap[t.date] || { date: t.date, expense: 0, income: 0 }
      dailyMap[t.date][t.type] += Number(t.amount)
    })
    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-10).map(d => ({
      ...d, label: formatShortDate(d.date)
    }))
  }, [transactions])

  const avgDaily = useMemo(() => {
    const daysInM = new Date(year, month, 0).getDate()
    return Math.round(totalExpense / daysInM)
  }, [totalExpense, year, month])

  // Show only last 5 dates on dashboard
  const { recentTransactions, recentDateGroups } = useMemo(() => {
    const allDates = [...new Set(transactions.map(t => t.date))].sort((a, b) => b.localeCompare(a))
    const recentDates = allDates.slice(0, 5)
    const recentTxs = transactions.filter(t => recentDates.includes(t.date))
    const groups = {}
    recentTxs.forEach(tx => { if (!groups[tx.date]) groups[tx.date] = []; groups[tx.date].push(tx) })
    return { recentTransactions: recentTxs, recentDateGroups: groups }
  }, [transactions])

  const recentDates = useMemo(() =>
    Object.keys(recentDateGroups).sort((a, b) => b.localeCompare(a)),
    [recentDateGroups]
  )

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Selamat datang, {profile?.name?.split(' ')[0]} 👋</h1>
          <p className="page-sub">Ringkasan keuangan bersama bulan ini</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={16} /> Tambah
        </button>
      </div>

      <div className="month-nav" style={{ marginBottom: 24 }}>
        <button className="month-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="month-name">{getMonthName(month, year)}</span>
        <button className="month-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      <div className="stat-grid">
        <StatCard label="💰 Saldo Bulan Ini" value={formatRupiah(balance)} valueClass={balance >= 0 ? 'green' : 'red'} sub={balance >= 0 ? 'Surplus' : 'Defisit'} />
        <StatCard label="↑ Pemasukan" value={formatRupiah(totalIncome)} valueClass="green" sub={`${transactions.filter(t => t.type === 'income').length} transaksi`} />
        <StatCard label="↓ Pengeluaran" value={formatRupiah(totalExpense)} valueClass="red" sub={`${transactions.filter(t => t.type === 'expense').length} transaksi`} />
        <StatCard label="📊 Rata-rata/Hari" value={formatRupiah(avgDaily)} valueClass="gold" sub="Pengeluaran harian" />
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ contain: 'layout paint' }}>
          <div className="section-title">Tren Harian</div>
          {dailyData.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><div className="icon" style={{ fontSize: 32 }}>📈</div><p>Belum ada data</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => v >= 1000000 ? `${v/1000000}jt` : `${v/1000}rb`} />
                <Tooltip formatter={v => formatRupiah(v)} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#f0eff4' }} labelStyle={{ color: '#c8a97e', fontWeight: 600 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="income" name="Pemasukan" fill="var(--green)" radius={[4,4,0,0]} opacity={0.8} isAnimationActive={false} />
                <Bar dataKey="expense" name="Pengeluaran" fill="var(--accent)" radius={[4,4,0,0]} opacity={0.8} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ contain: 'layout paint' }}>
          <div className="section-title">Pengeluaran per Kategori</div>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><div className="icon" style={{ fontSize: 32 }}>🥧</div><p>Belum ada pengeluaran</p></div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <PieChart width={140} height={140}>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatRupiah(v)} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#f0eff4' }} labelStyle={{ color: '#c8a97e', fontWeight: 600 }} />
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

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-title" style={{ margin: 0 }}>Transaksi Terakhir</div>
        <a href="/transactions" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Lihat semua →</a>
      </div>

      {loading ? <div className="spinner" /> : recentDates.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">💸</div>
            <h3>Belum ada transaksi</h3>
            <p>Mulai catat pengeluaran atau pemasukan</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recentDates.map(date => (
            <DashDateGroup key={date} date={date} txs={recentDateGroups[date]} profiles={profiles} />
          ))}
        </div>
      )}

      {showModal && <TransactionModal onClose={() => setShowModal(false)} onSaved={loadData} />}
    </div>
  )
}