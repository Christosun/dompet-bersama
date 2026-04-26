import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah, getInitials, getAvatarColor, formatDate, getCurrentMonth, getMonthName } from '../lib/utils'
import { PlusCircle, Search, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import TransactionModal from '../components/TransactionModal'

function formatDateHeader(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return 'Hari Ini'
  if (isYesterday) return 'Kemarin'

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date)
}

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)

  // Month filter
  const [{ month, year }, setMonthYear] = useState(getCurrentMonth())

  // Other filters
  const [filterType, setFilterType] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [month, year])

  async function loadAll() {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: txs }, { data: cats }, { data: profs }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .gte('date', startDate)
        .lte('date', endDate)
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
  }

  async function deleteTransaction(id) {
    if (!confirm('Hapus transaksi ini?')) return
    await supabase.from('transactions').delete().eq('id', id)
    loadAll()
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

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCat !== 'all' && t.category_id !== filterCat) return false
    if (filterUser !== 'all' && t.user_id !== filterUser) return false
    if (dateFrom && t.date < dateFrom) return false
    if (dateTo && t.date > dateTo) return false
    if (search && !t.note?.toLowerCase().includes(search.toLowerCase()) && !t.categories?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Summary stats for filtered transactions
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalNet = totalIncome - totalExpense

  // Group by date
  const groups = {}
  filtered.forEach(tx => {
    if (!groups[tx.date]) groups[tx.date] = []
    groups[tx.date].push(tx)
  })
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  function handleEdit(tx) {
    setEditData(tx)
    setShowModal(true)
  }

  function clearFilters() {
    setFilterType('all'); setFilterCat('all'); setFilterUser('all')
    setDateFrom(''); setDateTo(''); setSearch('')
  }

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

      {/* Month Navigator */}
      <div className="month-nav" style={{ marginBottom: 20 }}>
        <button className="month-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="month-name">{getMonthName(month, year)}</span>
        <button className="month-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {/* Filters */}
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
              <input type="text" className="form-input" placeholder="Catatan atau kategori..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
          </div>
          {hasFilter && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ alignSelf: 'flex-end' }}>Reset</button>
          )}
        </div>
      </div>

      {/* Monthly summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10,
        marginBottom: 20
      }}>
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

      {/* Grouped transaction list */}
      {loading ? <div className="spinner" /> : sortedDates.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>Tidak ada transaksi</h3>
            <p>Coba ubah filter atau tambah transaksi baru</p>
          </div>
        </div>
      ) : (
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
                {/* Date header */}
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

                {/* Transactions for that day */}
                <div>
                  {txs.map((tx, i) => {
                    const who = profiles[tx.user_id]
                    const isOwn = tx.user_id === user.id
                    return (
                      <div
                        key={tx.id}
                        className="tx-item"
                        style={{
                          borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none',
                          borderRadius: 0,
                          padding: '10px 16px',
                          gap: 12
                        }}
                      >
                        <div className="tx-icon" style={{ background: `${tx.categories?.color || '#6b7280'}20` }}>
                          {tx.categories?.icon || '💰'}
                        </div>
                        <div className="tx-info">
                          <div className="tx-cat">{tx.categories?.name || 'Tidak diketahui'}</div>
                          <div className="tx-note">
                            {tx.note && <span style={{ marginRight: 6 }}>{tx.note}</span>}
                          </div>
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
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleEdit(tx)} title="Edit"><Pencil size={13} /></button>
                            <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteTransaction(tx.id)} title="Hapus"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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