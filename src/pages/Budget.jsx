import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah, getCurrentMonth, getMonthName } from '../lib/utils'
import { ChevronLeft, ChevronRight, PlusCircle, X, Pencil } from 'lucide-react'

function BudgetModal({ data, categories, month, year, onClose, onSaved }) {
  const { user } = useAuth()
  const [categoryId, setCategoryId] = useState(data?.category_id || '')
  const [amount, setAmount] = useState(data?.amount || '')
  const [loading, setLoading] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!categoryId || !amount) return
    setLoading(true)
    const payload = { user_id: user.id, category_id: categoryId, amount: parseFloat(amount), month, year }
    let error
    if (data) {
      ;({ error } = await supabase.from('budgets').update(payload).eq('id', data.id))
    } else {
      ;({ error } = await supabase.from('budgets').upsert(payload, { onConflict: 'category_id,month,year' }))
    }
    setLoading(false)
    if (!error) { onSaved(); onClose() }
    else alert('Gagal: ' + error.message)
  }

  const displayAmount = amount ? parseInt(String(amount).replace(/\D/g, '')).toLocaleString('id-ID') : ''

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{data ? 'Edit Budget' : 'Tambah Budget'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Kategori Pengeluaran</label>
            <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
              <option value="">Pilih kategori</option>
              {categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Budget Bulan {getMonthName(month, year)} (Rp)</label>
            <input className="form-input" type="text" inputMode="numeric" value={displayAmount}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" required
              style={{ fontSize: 18, fontFamily: 'var(--font-display)' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Budget() {
  const { user } = useAuth()
  const [{ month, year }, setMonthYear] = useState(getCurrentMonth())
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [spending, setSpending] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)

  useEffect(() => { loadData() }, [month, year])

  async function loadData() {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: bgs }, { data: cats }, { data: txs }] = await Promise.all([
      supabase.from('budgets').select('*, categories(name, icon, color)').eq('month', month).eq('year', year),
      supabase.from('categories').select('*').order('name'),
      supabase.from('transactions').select('category_id, amount, type').eq('type', 'expense').gte('date', startDate).lte('date', endDate)
    ])

    setBudgets(bgs || [])
    setCategories(cats || [])

    const sp = {}
    ;(txs || []).forEach(t => { sp[t.category_id] = (sp[t.category_id] || 0) + Number(t.amount) })
    setSpending(sp)
    setLoading(false)
  }

  async function deleteBudget(id) {
    if (!confirm('Hapus budget ini?')) return
    await supabase.from('budgets').delete().eq('id', id)
    loadData()
  }

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent = budgets.reduce((s, b) => s + (spending[b.category_id] || 0), 0)
  const totalLeft = totalBudget - totalSpent

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

  function getBarColor(pct) {
    if (pct >= 100) return 'var(--red)'
    if (pct >= 80) return '#f59e0b'
    return 'var(--green)'
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-sub">Atur batas pengeluaran per kategori</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setShowModal(true) }}>
          <PlusCircle size={16} /> Tambah Budget
        </button>
      </div>

      <div className="month-nav" style={{ marginBottom: 24 }}>
        <button className="month-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="month-name">{getMonthName(month, year)}</span>
        <button className="month-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Budget</div>
          <div className="stat-value gold">{formatRupiah(totalBudget)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Terpakai</div>
          <div className="stat-value red">{formatRupiah(totalSpent)}</div>
          <div className="stat-sub">{totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0}% dari budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sisa Budget</div>
          <div className={`stat-value ${totalLeft >= 0 ? 'green' : 'red'}`}>{formatRupiah(totalLeft)}</div>
          <div className="stat-sub">{totalLeft < 0 ? '⚠️ Melebihi budget!' : 'Aman'}</div>
        </div>
      </div>

      {/* Overall progress */}
      {totalBudget > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>Total penggunaan budget</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: getBarColor(totalSpent / totalBudget * 100) }}>
              {Math.round(totalSpent / totalBudget * 100)}%
            </span>
          </div>
          <div className="budget-bar-track" style={{ height: 10 }}>
            <div className="budget-bar-fill" style={{
              width: `${Math.min(totalSpent / totalBudget * 100, 100)}%`,
              background: getBarColor(totalSpent / totalBudget * 100)
            }} />
          </div>
        </div>
      )}

      {loading ? <div className="spinner" /> : budgets.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎯</div>
          <h3>Belum ada budget</h3>
          <p>Tambah budget untuk mulai tracking pengeluaran</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {budgets.map(b => {
            const spent = spending[b.category_id] || 0
            const pct = b.amount > 0 ? Math.round(spent / b.amount * 100) : 0
            const left = Number(b.amount) - spent
            return (
              <div key={b.id} className="card card-sm">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${b.categories?.color || '#6b7280'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {b.categories?.icon || '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{b.categories?.name || 'Kategori'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: getBarColor(pct) }}>{pct}%</span>
                    </div>
                    <div className="budget-bar-track">
                      <div className="budget-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: getBarColor(pct) }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>Terpakai: <span style={{ color: 'var(--text-sub)' }}>{formatRupiah(spent)}</span></span>
                      <span>Sisa: <span style={{ color: left < 0 ? 'var(--red)' : 'var(--green)' }}>{formatRupiah(left)}</span></span>
                      <span>Budget: <span style={{ color: 'var(--accent)' }}>{formatRupiah(b.amount)}</span></span>
                    </div>
                  </div>
                  {b.user_id === user.id && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setEditData(b); setShowModal(true) }}><Pencil size={13} /></button>
                      <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteBudget(b.id)}><X size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <BudgetModal
          data={editData}
          categories={categories}
          month={month}
          year={year}
          onClose={() => { setShowModal(false); setEditData(null) }}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
