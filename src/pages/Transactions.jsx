import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah, getInitials, getAvatarColor, formatDate } from '../lib/utils'
import { PlusCircle, Search, Trash2, Pencil } from 'lucide-react'
import TransactionModal from '../components/TransactionModal'

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)

  // Filters
  const [filterType, setFilterType] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: txs }, { data: cats }, { data: profs }] = await Promise.all([
      supabase.from('transactions').select('*, categories(name, icon, color)').order('date', { ascending: false }).order('created_at', { ascending: false }),
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

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCat !== 'all' && t.category_id !== filterCat) return false
    if (filterUser !== 'all' && t.user_id !== filterUser) return false
    if (dateFrom && t.date < dateFrom) return false
    if (dateTo && t.date > dateTo) return false
    if (search && !t.note?.toLowerCase().includes(search.toLowerCase()) && !t.categories?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalFiltered = filtered.reduce((s, t) => t.type === 'expense' ? s - t.amount : s + t.amount, 0)

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

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
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

      {/* Summary of filtered */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} transaksi ditemukan</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: totalFiltered >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {totalFiltered >= 0 ? '+' : ''}{formatRupiah(totalFiltered)}
        </span>
      </div>

      {/* List */}
      <div className="card" style={{ padding: 8 }}>
        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>Tidak ada transaksi</h3>
            <p>Coba ubah filter atau tambah transaksi baru</p>
          </div>
        ) : (
          <div className="tx-list">
            {filtered.map(tx => {
              const who = profiles[tx.user_id]
              const isOwn = tx.user_id === user.id
              return (
                <div className="tx-item" key={tx.id} style={{ gap: 12 }}>
                  <div className="tx-icon" style={{ background: `${tx.categories?.color || '#6b7280'}20` }}>
                    {tx.categories?.icon || '💰'}
                  </div>
                  <div className="tx-info">
                    <div className="tx-cat">{tx.categories?.name || 'Tidak diketahui'}</div>
                    <div className="tx-note">{tx.note && <span style={{ marginRight: 8 }}>{tx.note}</span>}<span style={{ color: 'var(--text-muted)' }}>{formatDate(tx.date)}</span></div>
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
        )}
      </div>

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
