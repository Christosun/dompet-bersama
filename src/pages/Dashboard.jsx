import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah, formatShortDate, getCurrentMonth, getMonthName } from '../lib/utils'
import Avatar from '../components/Avatar'
import { PlusCircle, ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, Activity, Receipt, BarChart2, PieChart as PieChartIcon, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import { CategoryIcon } from '../components/CategoryIcon'
import TransactionModal from '../components/TransactionModal'
import CalendarHeatmap from '../components/CalendarHeatmap'
import { SkeletonStatGrid, SkeletonTransactionList } from '../components/Skeleton'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const TOOLTIP_STYLE = {
  background: '#1a1d24',
  border: '1px solid rgba(245,166,35,0.25)',
  borderRadius: 10,
  color: '#f5f0e8',
  fontSize: 12,
}

const PIE_COLORS = ['#f5a623', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#34d399']

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

function GroupedTransactions({ transactions, profiles }) {
  const groups = {}
  transactions.forEach(tx => { if (!groups[tx.date]) groups[tx.date] = []; groups[tx.date].push(tx) })
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sortedDates.map(date => {
        const txs = groups[date]
        const dayIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const dayExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
        const dayNet = dayIncome - dayExpense

        return (
          <div key={date} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
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
              {txs.map((tx, i) => {
                const who = profiles[tx.user_id]
                return (
                  <div key={tx.id} className="tx-item" style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none', borderRadius: 0, padding: '10px 16px' }}>
                    <div className="tx-icon" style={{ background: `${tx.categories?.color || '#6b7280'}20` }}>
                      <CategoryIcon icon={tx.categories?.icon} size={17} color={tx.categories?.color || 'var(--text-muted)'} />
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
                          <Avatar name={who.name} size={16} tooltip />
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

function SmartInsights({ transactions, budgets, spending }) {
  const insights = []

  // Budget alerts
  budgets.forEach(b => {
    const spent = spending[b.category_id] || 0
    const pct = b.amount > 0 ? Math.round(spent / b.amount * 100) : 0
    if (pct >= 100) {
      insights.push({ type: 'error', msg: `Budget "${b.categories?.name}" melebihi batas! (${pct}%)` })
    } else if (pct >= 80) {
      insights.push({ type: 'warning', msg: `Budget "${b.categories?.name}" hampir habis (${pct}%)` })
    }
  })

  // No income this month
  const hasIncome = transactions.some(t => t.type === 'income')
  if (!hasIncome && transactions.length > 3) {
    insights.push({ type: 'warning', msg: 'Belum ada pemasukan dicatat bulan ini' })
  }

  // Negative balance
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  if (totalIncome > 0 && totalExpense > totalIncome) {
    insights.push({ type: 'error', msg: `Pengeluaran melebihi pemasukan bulan ini (defisit ${formatRupiah(totalExpense - totalIncome)})` })
  }

  if (insights.length === 0) {
    if (transactions.length > 0) {
      insights.push({ type: 'success', msg: 'Keuangan bulan ini terlihat sehat' })
    }
  }

  if (insights.length === 0) return null

  const colors = {
    error: { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: <AlertTriangle size={14} color="var(--red)" />, text: 'var(--red)' },
    warning: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', icon: <AlertTriangle size={14} color="#fbbf24" />, text: '#fbbf24' },
    success: { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', icon: <CheckCircle size={14} color="var(--green)" />, text: 'var(--green)' },
  }

  return (
    <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <Zap size={14} color="var(--accent)" />
        <span className="section-title" style={{ margin: 0 }}>Smart Insights</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((ins, i) => {
          const c = colors[ins.type]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8 }}>
              <span style={{ flexShrink: 0 }}>{c.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.4 }}>{ins.msg}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [{ month, year }, setMonthYear] = useState(getCurrentMonth())
  const [transactions, setTransactions] = useState([])
  const [profiles, setProfiles] = useState({})
  const [budgets, setBudgets] = useState([])
  const [spending, setSpending] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const realtimeRef = useRef(null)
  const loadDataRef = useRef(null)

  useEffect(() => { loadDataRef.current = loadData })

  useEffect(() => {
    loadData()
    setupRealtime()

    function handleFabSaved() { loadDataRef.current?.() }
    window.addEventListener('fab-transaction-saved', handleFabSaved)

    return () => {
      realtimeRef.current?.unsubscribe()
      window.removeEventListener('fab-transaction-saved', handleFabSaved)
    }
  }, [month, year])

  function setupRealtime() {
    realtimeRef.current?.unsubscribe()
    realtimeRef.current = supabase
      .channel(`dashboard-${month}-${year}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadDataRef.current?.())
      .subscribe()
  }

  async function loadData() {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

    const [{ data: txs }, { data: profs }, { data: bgs }, { data: spTxs }] = await Promise.all([
      supabase.from('transactions').select('*, categories(name, icon, color)').gte('date', startDate).lte('date', endDate).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('budgets').select('*, categories(name, icon, color)').eq('month', month).eq('year', year),
      supabase.from('transactions').select('category_id, amount').eq('type', 'expense').gte('date', startDate).lte('date', endDate),
    ])

    setTransactions(txs || [])
    const pm = {}
    ;(profs || []).forEach(p => pm[p.id] = p)
    setProfiles(pm)
    setBudgets(bgs || [])
    const sp = {}
    ;(spTxs || []).forEach(t => { sp[t.category_id] = (sp[t.category_id] || 0) + Number(t.amount) })
    setSpending(sp)
    setLoading(false)
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpense

  const categoryMap = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const key = t.categories?.name || 'Lainnya'
    categoryMap[key] = (categoryMap[key] || 0) + Number(t.amount)
  })
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)

  const dailyMap = {}
  transactions.forEach(t => {
    dailyMap[t.date] = dailyMap[t.date] || { date: t.date, expense: 0, income: 0 }
    dailyMap[t.date][t.type] += Number(t.amount)
  })
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-10).map(d => ({ ...d, label: formatShortDate(d.date) }))

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

  const allDates = [...new Set(transactions.map(t => t.date))].sort((a, b) => b.localeCompare(a))
  const recentTransactions = transactions.filter(t => allDates.slice(0, 5).includes(t.date))

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Selamat datang, {profile?.name?.split(' ')[0]}</h1>
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

      {loading ? (
        <SkeletonStatGrid />
      ) : (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Wallet size={11} /> Saldo Bulan Ini</div>
            <div className={`stat-value ${balance >= 0 ? 'green' : 'red'}`}>{formatRupiah(balance)}</div>
            <div className="stat-sub">{balance >= 0 ? 'Surplus' : 'Defisit'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><TrendingUp size={11} style={{ color: 'var(--green)' }} /> Pemasukan</div>
            <div className="stat-value green">{formatRupiah(totalIncome)}</div>
            <div className="stat-sub">{transactions.filter(t => t.type === 'income').length} transaksi</div>
          </div>
          <div className="stat-card">
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><TrendingDown size={11} style={{ color: 'var(--red)' }} /> Pengeluaran</div>
            <div className="stat-value red">{formatRupiah(totalExpense)}</div>
            <div className="stat-sub">{transactions.filter(t => t.type === 'expense').length} transaksi</div>
          </div>
          <div className="stat-card">
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Activity size={11} /> Rata-rata/Hari</div>
            <div className="stat-value gold">{formatRupiah(Math.round(totalExpense / new Date(year, month, 0).getDate()))}</div>
            <div className="stat-sub">Pengeluaran harian</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title">Tren Harian</div>
          {loading ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ margin: 0 }} /></div> :
            dailyData.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}><div className="icon"><BarChart2 size={36} strokeWidth={1.2} /></div><p>Belum ada data</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => v >= 1000000 ? `${v / 1000000}jt` : `${v / 1000}rb`} />
                  <Tooltip formatter={v => formatRupiah(v)} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#f5f0e8' }} labelStyle={{ color: '#f7c055', fontWeight: 600 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="income" name="Pemasukan" fill="var(--green)" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Bar dataKey="expense" name="Pengeluaran" fill="var(--accent)" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="card">
          <div className="section-title">Pengeluaran per Kategori</div>
          {loading ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ margin: 0 }} /></div> :
            pieData.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}><div className="icon"><PieChartIcon size={36} strokeWidth={1.2} /></div><p>Belum ada pengeluaran</p></div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatRupiah(v)} contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#f5f0e8' }} labelStyle={{ color: '#f7c055', fontWeight: 600 }} />
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
            )
          }
        </div>
      </div>

      {/* Smart Insights */}
      {!loading && <SmartInsights transactions={transactions} budgets={budgets} spending={spending} />}

      {/* Calendar Heatmap */}
      {!loading && transactions.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">Heatmap Pengeluaran — {getMonthName(month, year)}</div>
          <CalendarHeatmap transactions={transactions} month={month} year={year} />
        </div>
      )}

      {/* Recent transactions */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-title" style={{ margin: 0 }}>Transaksi Terakhir</div>
        <a href="/transactions" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Lihat semua →</a>
      </div>

      {loading ? <SkeletonTransactionList count={2} /> : recentTransactions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon"><Receipt size={44} strokeWidth={1.2} /></div>
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
