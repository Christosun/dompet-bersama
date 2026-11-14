import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { formatRupiah, getCurrentMonth, getMonthName, todayStr } from '../lib/utils'
import Avatar from '../components/Avatar'
import { PlusCircle, Search, Trash2, Pencil, ChevronDown, SlidersHorizontal, SearchX, Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { CategoryIcon } from '../components/CategoryIcon'
import TransactionModal from '../components/TransactionModal'
import { SkeletonTransactionList, SkeletonStatGrid } from '../components/Skeleton'
import Select from '../components/Select'
import DatePicker from '../components/DatePicker'
import MonthNav from '../components/MonthNav'

function formatDateHeader(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const formattedDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  if (isToday) return `Hari Ini • ${formattedDate}`
  if (isYesterday) return `Kemarin • ${formattedDate}`
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

// Jumlah hari inklusif antara dua tanggal 'YYYY-MM-DD' (aman dari DST)
function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000) + 1
}

export default function Transactions() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
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
  const [showFilters, setShowFilters] = useState(() => window.innerWidth > 768)

  const realtimeRef = useRef(null)
  const loadAllRef = useRef(null)

  // Selalu simpan referensi loadAll terbaru agar event listener tidak stale
  useEffect(() => { loadAllRef.current = loadAll })

  useEffect(() => {
    loadAll()
    setupRealtime()

    // Dengarkan event dari FAB di Layout
    function handleFabSaved() { loadAllRef.current?.() }
    window.addEventListener('fab-transaction-saved', handleFabSaved)

    return () => {
      realtimeRef.current?.unsubscribe()
      window.removeEventListener('fab-transaction-saved', handleFabSaved)
    }
  }, [month, year])

  function setupRealtime() {
    realtimeRef.current?.unsubscribe()
    realtimeRef.current = supabase
      .channel(`transactions-page-${month}-${year}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadAllRef.current?.())
      .subscribe()
  }

  async function loadAll() {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

    const [{ data: txs }, { data: cats }, { data: profs }] = await Promise.all([
      supabase.from('transactions').select('*, categories(name, icon, color)')
        .gte('date', startDate).lte('date', endDate)
        .order('date', { ascending: false }).order('created_at', { ascending: false }),
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

  async function deleteTransaction(tx) {
    const ok = await confirm({ title: 'Hapus Transaksi', message: 'Transaksi ini akan dihapus permanen.', confirmLabel: 'Hapus' })
    if (!ok) return

    // Optimistic remove
    setTransactions(prev => prev.filter(t => t.id !== tx.id))

    const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
    if (error) {
      setTransactions(prev => [...prev, tx].sort((a, b) => b.date.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at || '') || 0))
      toast.error('Gagal menghapus: ' + error.message)
      return
    }

    // Show undo toast
    const toastId = toast.success('Transaksi dihapus', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: async () => {
          const { data: restored, error: insertErr } = await supabase
            .from('transactions')
            .insert({ user_id: tx.user_id, type: tx.type, amount: tx.amount, category_id: tx.category_id, note: tx.note, date: tx.date })
            .select('*, categories(name, icon, color)')
            .single()
          if (!insertErr && restored) {
            setTransactions(prev => [restored, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
            toast.success('Transaksi dikembalikan')
          } else {
            toast.error('Gagal undo')
          }
        }
      }
    })
  }

  function handleEdit(tx) { setEditData(tx); setShowModal(true) }

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCat !== 'all' && t.category_id !== filterCat) return false
    if (filterUser !== 'all' && t.user_id !== filterUser) return false
    if (dateFrom && t.date < dateFrom) return false
    if (dateTo && t.date > dateTo) return false
    if (search && !t.note?.toLowerCase().includes(search.toLowerCase()) && !t.categories?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalNet = totalIncome - totalExpense

    // ── Rata-rata harian, mengikuti filter ──────────────────
  // Jenis "Pemasukan" → rata-rata pemasukan; selain itu → rata-rata pengeluaran
  const avgIsIncome = filterType === 'income'
  const avgTotal = avgIsIncome ? totalIncome : totalExpense

  const mm = String(month).padStart(2, '0')
  const monthStart = `${year}-${mm}-01`
  const monthEnd = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  const today = todayStr()
  const isCurrentMonth = today >= monthStart && today <= monthEnd

  // Rentang hari efektif = irisan (bulan yang dilihat) ∩ (filter Dari/Sampai)
  const rangeStart = dateFrom && dateFrom > monthStart ? dateFrom : monthStart
  let rangeEnd = dateTo && dateTo < monthEnd ? dateTo : monthEnd
  if (isCurrentMonth && rangeEnd > today) rangeEnd = today // bulan berjalan: hanya sampai hari ini

  const avgDays = rangeStart <= rangeEnd ? daysBetween(rangeStart, rangeEnd) : 0
  const avgPerDay = avgDays > 0 ? Math.round(avgTotal / avgDays) : 0
  const avgHint = (dateFrom || dateTo)
    ? `Dihitung ${avgDays} hari sesuai rentang tanggal filter`
    : isCurrentMonth
      ? `Dihitung ${avgDays} hari berjalan bulan ini`
      : `Dihitung ${avgDays} hari penuh di bulan ini`

  const groups = {}
  filtered.forEach(tx => { if (!groups[tx.date]) groups[tx.date] = []; groups[tx.date].push(tx) })
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  function clearFilters() {
    setFilterType('all'); setFilterCat('all'); setFilterUser('all')
    setDateFrom(''); setDateTo(''); setSearch('')
  }

  const activeCount = [filterType !== 'all', filterCat !== 'all', filterUser !== 'all', dateFrom, dateTo, search].filter(Boolean).length
  const hasFilter = activeCount > 0

  const typeOptions = [
    { value: 'all', label: 'Semua' },
    { value: 'expense', label: 'Pengeluaran' },
    { value: 'income', label: 'Pemasukan' },
  ]
  const catOptions = [
    { value: 'all', label: 'Semua Kategori' },
    ...categories.map(c => ({
      value: c.id, label: c.name,
      icon: <CategoryIcon icon={c.icon} size={15} color={c.color} />,
    })),
  ]
  const userOptions = [
    { value: 'all', label: 'Semua' },
    ...Object.values(profiles).map(p => ({
      value: p.id, label: p.name,
      icon: <Avatar name={p.name} size={20} />,
    })),
  ]

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

      <div style={{ marginBottom: 24 }}>
        <MonthNav month={month} year={year} onChange={setMonthYear} />
      </div>

      {/* Summary stats */}
      {loading ? (
        <SkeletonStatGrid />
      ) : (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><TrendingUp size={11} style={{ color: 'var(--green)' }} /> Pemasukan</div>
            <div className="stat-value green">{formatRupiah(totalIncome)}</div>
            <div className="stat-sub">{filtered.filter(t => t.type === 'income').length} transaksi</div>
          </div>
          <div className="stat-card">
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><TrendingDown size={11} style={{ color: 'var(--red)' }} /> Pengeluaran</div>
            <div className="stat-value red">{formatRupiah(totalExpense)}</div>
            <div className="stat-sub">{filtered.filter(t => t.type === 'expense').length} transaksi</div>
          </div>
          <div className="stat-card">
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Wallet size={11} /> Selisih</div>
            <div className={`stat-value ${totalNet >= 0 ? 'green' : 'red'}`}>{formatRupiah(totalNet)}</div>
            <div className="stat-sub">{filtered.length} total transaksi</div>
          </div>
          <div className="stat-card" title={avgHint}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Activity size={11} /> Rata-rata/Hari</div>
            <div className="stat-value gold">{formatRupiah(avgPerDay)}</div>
            <div className="stat-sub">{avgIsIncome ? 'Pemasukan' : 'Pengeluaran'} · {avgDays} hari</div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="card filter-card" style={{ marginBottom: 16 }}>
        <div className="filter-head">
          <button type="button" className="filter-toggle" aria-expanded={showFilters} aria-controls="tx-filters"
            onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal size={15} className="filter-ico" />
            <span>Filter</span>
            {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
            <ChevronDown size={15} className="filter-chev" />
          </button>
          {hasFilter && <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Reset</button>}
        </div>

        <div id="tx-filters" className={`filter-collapse${showFilters ? '' : ' closed'}`}>
          <div className="filter-inner">
            <div className="filter-grid">
              <div className="filter-jenis">
                <div className="form-label" style={{ marginBottom: 6 }}>Jenis</div>
                <Select value={filterType} onChange={setFilterType} options={typeOptions} title="Jenis" />
              </div>
              <div className="filter-kategori">
                <div className="form-label" style={{ marginBottom: 6 }}>Kategori</div>
                <Select value={filterCat} onChange={setFilterCat} options={catOptions} title="Kategori" />
              </div>
              <div className="filter-oleh">
                <div className="form-label" style={{ marginBottom: 6 }}>Dicatat oleh</div>
                <Select value={filterUser} onChange={setFilterUser} options={userOptions} title="Dicatat oleh" />
              </div>
              <div className="filter-dari">
                <div className="form-label" style={{ marginBottom: 6 }}>Dari</div>
                <DatePicker value={dateFrom} onChange={setDateFrom} max={dateTo || undefined} placeholder="Pilih tanggal" title="Dari tanggal" />
              </div>
              <div className="filter-sampai">
                <div className="form-label" style={{ marginBottom: 6 }}>Sampai</div>
                <DatePicker value={dateTo} onChange={setDateTo} min={dateFrom || undefined} placeholder="Pilih tanggal" title="Sampai tanggal" />
              </div>
              <div className="filter-cari">
                <div className="form-label" style={{ marginBottom: 6 }}>Cari</div>
                <div className="search-wrap">
                  <input type="text" className="form-input" aria-label="Cari catatan atau kategori" value={search} onChange={e => setSearch(e.target.value)} />
                  <Search size={16} className="search-ico" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped list */}
      {loading ? <SkeletonTransactionList count={3} /> : sortedDates.length === 0 ? (
        <div className="card">
          <div className="empty-state empty-fill">
            <div className="icon"><SearchX size={44} strokeWidth={1.2} /></div>
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
                    const isOwn = tx.user_id === user.id
                    return (
                      <div
                        key={tx.id}
                        className="tx-item"
                        style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--border)' : 'none', borderRadius: 0, padding: '10px 16px', gap: 12 }}
                      >
                        <div className="tx-icon" style={{ background: `${tx.categories?.color || '#6b7280'}20` }}>
                          <CategoryIcon icon={tx.categories?.icon} size={17} color={tx.categories?.color || 'var(--text-muted)'} />
                        </div>
                        <div className="tx-info">
                          <div className="tx-cat">{tx.categories?.name || 'Tidak diketahui'}</div>
                          <div className="tx-note">{tx.note && <span style={{ marginRight: 6 }}>{tx.note}</span>}</div>
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
                        {isOwn && (
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleEdit(tx)} title="Edit"><Pencil size={13} /></button>
                            <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteTransaction(tx)} title="Hapus"><Trash2 size={13} /></button>
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
        <TransactionModal onClose={() => { setShowModal(false); setEditData(null) }} onSaved={loadAll} editData={editData} />
      )}
    </div>
  )
}
