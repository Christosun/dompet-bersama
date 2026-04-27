import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah, getInitials, getAvatarColor, getCurrentMonth, getMonthName } from '../lib/utils'
import { PlusCircle, Search, Trash2, Pencil, ChevronLeft, ChevronRight, X } from 'lucide-react'
import TransactionModal from '../components/TransactionModal'

function formatDateHeader(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(date)
  if (isToday) return `Hari Ini • ${formattedDate}`
  if (isYesterday) return `Kemarin • ${formattedDate}`
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date)
}

// Memoized transaction item — only re-renders when its own data changes
const TxItem = memo(function TxItem({ tx, who, isOwn, isLast, onEdit, onDelete }) {
  return (
    <div
      className="tx-item"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        borderRadius: 0,
        padding: '10px 16px',
        gap: 12,
        contain: 'layout style',
      }}
    >
      <div className="tx-icon" style={{ background: `${tx.categories?.color || '#6b7280'}20` }}>
        {tx.categories?.icon || '💰'}
      </div>
      <div className="tx-info">
        <div className="tx-cat">{tx.categories?.name || 'Tidak diketahui'}</div>
        {tx.note && <div className="tx-note">{tx.note}</div>}
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
      {isOwn && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={() => onEdit(tx)} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="btn btn-icon btn-danger btn-sm" onClick={() => onDelete(tx.id)} title="Hapus">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
})

// Memoized date group
const DateGroup = memo(function DateGroup({ date, txs, profiles, userId, onEdit, onDelete }) {
  const dayIncome = useMemo(() => txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), [txs])
  const dayExpense = useMemo(() => txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0), [txs])
  const dayNet = dayIncome - dayExpense

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      contain: 'layout',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 16px', background: 'var(--bg-card2)',
        borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
            {formatDateHeader(date)}
          </span>
          <span style={{
            fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 99, padding: '2px 8px', color: 'var(--text-muted)'
          }}>
            {txs.length} transaksi
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {dayIncome > 0 && <span style={{ fontSize: 12, color: 'var(--green)' }}>+{formatRupiah(dayIncome)}</span>}
          {dayExpense > 0 && <span style={{ fontSize: 12, color: 'var(--red)' }}>-{formatRupiah(dayExpense)}</span>}
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: dayNet >= 0 ? 'var(--green)' : 'var(--red)',
            paddingLeft: 6, borderLeft: '1px solid var(--border)'
          }}>
            {dayNet >= 0 ? '+' : ''}{formatRupiah(dayNet)}
          </span>
        </div>
      </div>
      <div>
        {txs.map((tx, i) => (
          <TxItem
            key={tx.id}
            tx={tx}
            who={profiles[tx.user_id]}
            isOwn={tx.user_id === userId}
            isLast={i === txs.length - 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
})

// Memoized filter bar
const FilterBar = memo(function FilterBar({
  filterType, setFilterType, filterCat, setFilterCat,
  filterUser, setFilterUser, dateFrom, setDateFrom,
  dateTo, setDateTo, search, setSearch,
  categories, profiles, hasFilter, onClear
}) {
  return (
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 140px' }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Jenis</div>
          <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">Semua</option>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Kategori</div>
          <select className="form-input" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">Semua Kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Dicatat oleh</div>
          <select className="form-input" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="all">Semua</option>
            {Object.values(profiles).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Dari</div>
          <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Sampai</div>
          <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Cari</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" placeholder="Catatan atau kategori..."
              value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
        </div>
        {hasFilter && (
          <button className="btn btn-ghost btn-sm" onClick={onClear} style={{ alignSelf: 'flex-end' }}>
            <X size={13} /> Reset
          </button>
        )}
      </div>
    </div>
  )
})

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const [{ month, year }, setMonthYear] = useState(getCurrentMonth())
  const [filterType, setFilterType] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [month, year])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: txs }, { data: cats }, { data: profs }] = await Promise.all([
      supabase.from('transactions')
        .select('*, categories(name, icon, color)')
        .gte('date', startDate).lte('date', endDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('profiles').select('*')
    ])

    setTransactions(txs || [])
    setCategories(cats || [])
    const pm = {}
    ;(profs || []).forEach(p => pm[p.id] = p)
    setProfiles(pm)
    setLoading(false)
  }, [month, year])

  const deleteTransaction = useCallback(async (id) => {
    if (!confirm('Hapus transaksi ini?')) return
    await supabase.from('transactions').delete().eq('id', id)
    loadAll()
  }, [loadAll])

  const handleEdit = useCallback((tx) => {
    setEditData(tx)
    setShowModal(true)
  }, [])

  const clearFilters = useCallback(() => {
    setFilterType('all'); setFilterCat('all'); setFilterUser('all')
    setDateFrom(''); setDateTo(''); setSearch('')
  }, [])

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

  // All filtering via useMemo — runs only when deps change, not on every render
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterCat !== 'all' && t.category_id !== filterCat) return false
      if (filterUser !== 'all' && t.user_id !== filterUser) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.note?.toLowerCase().includes(q) && !t.categories?.name?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [transactions, filterType, filterCat, filterUser, dateFrom, dateTo, search])

  const { totalIncome, totalExpense, totalNet } = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { totalIncome: inc, totalExpense: exp, totalNet: inc - exp }
  }, [filtered])

  // Group by date — memoized
  const { groups, sortedDates } = useMemo(() => {
    const g = {}
    filtered.forEach(tx => {
      if (!g[tx.date]) g[tx.date] = []
      g[tx.date].push(tx)
    })
    return { groups: g, sortedDates: Object.keys(g).sort((a, b) => b.localeCompare(a)) }
  }, [filtered])

  const hasFilter = filterType !== 'all' || filterCat !== 'all' || filterUser !== 'all' || dateFrom || dateTo || search

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Transaksi</h1>
          <p className="page-sub">Semua catatan pemasukan & pengeluaran</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setShowModal(true) }}>
          <PlusCircle size={16} /> Tambah
        </button>
      </div>

      <div className="month-nav" style={{ marginBottom: 20 }}>
        <button className="month-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="month-name">{getMonthName(month, year)}</span>
        <button className="month-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      <FilterBar
        filterType={filterType} setFilterType={setFilterType}
        filterCat={filterCat} setFilterCat={setFilterCat}
        filterUser={filterUser} setFilterUser={setFilterUser}
        dateFrom={dateFrom} setDateFrom={setDateFrom}
        dateTo={dateTo} setDateTo={setDateTo}
        search={search} setSearch={setSearch}
        categories={categories} profiles={profiles}
        hasFilter={hasFilter} onClear={clearFilters}
      />

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <div className="stat-label">Pemasukan</div>
          <div className="stat-value green" style={{ fontSize: 18 }}>{formatRupiah(totalIncome)}</div>
          <div className="stat-sub">{filtered.filter(t => t.type === 'income').length} transaksi</div>
        </div>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <div className="stat-label">Pengeluaran</div>
          <div className="stat-value red" style={{ fontSize: 18 }}>{formatRupiah(totalExpense)}</div>
          <div className="stat-sub">{filtered.filter(t => t.type === 'expense').length} transaksi</div>
        </div>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <div className="stat-label">Selisih</div>
          <div className={`stat-value ${totalNet >= 0 ? 'green' : 'red'}`} style={{ fontSize: 18 }}>{formatRupiah(totalNet)}</div>
          <div className="stat-sub">{filtered.length} total transaksi</div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : sortedDates.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>Tidak ada transaksi</h3>
            <p>Coba ubah filter atau tambah transaksi baru</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedDates.map(date => (
            <DateGroup
              key={date}
              date={date}
              txs={groups[date]}
              profiles={profiles}
              userId={user.id}
              onEdit={handleEdit}
              onDelete={deleteTransaction}
            />
          ))}
        </div>
      )}

      {showModal && (
        <TransactionModal
          onClose={() => { setShowModal(false); setEditData(null) }}
          onSaved={loadAll}
          editData={editData}
        />
      )}
    </div>
  )
}