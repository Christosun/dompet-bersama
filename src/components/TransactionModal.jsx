import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { X } from 'lucide-react'

export default function TransactionModal({ onClose, onSaved, editData }) {
  const { user } = useAuth()
  const [type, setType] = useState(editData?.type || 'expense')
  const [amount, setAmount] = useState(editData?.amount || '')
  const [categoryId, setCategoryId] = useState(editData?.category_id || '')
  const [note, setNote] = useState(editData?.note || '')
  const [date, setDate] = useState(editData?.date || new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [type])

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .in('type', [type, 'both'])
      .order('name')
    setCategories(data || [])
    if (data?.length && !categoryId) setCategoryId(data[0].id)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!amount || !categoryId) return
    setLoading(true)

    const payload = {
      user_id: user.id,
      type,
      amount: parseFloat(amount),
      category_id: categoryId,
      note: note.trim() || null,
      date,
    }

    let error
    if (editData) {
      ({ error } = await supabase.from('transactions').update(payload).eq('id', editData.id))
    } else {
      ({ error } = await supabase.from('transactions').insert(payload))
    }

    setLoading(false)
    if (!error) { onSaved(); onClose() }
    else alert('Gagal menyimpan: ' + error.message)
  }

  function handleAmountInput(e) {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setAmount(val)
  }

  const displayAmount = amount ? parseInt(amount).toLocaleString('id-ID') : ''

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{editData ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Jenis</label>
            <div className="type-toggle">
              <button type="button" className={type === 'expense' ? 'active-expense' : ''} onClick={() => { setType('expense'); setCategoryId('') }}>
                🔴 Pengeluaran
              </button>
              <button type="button" className={type === 'income' ? 'active-income' : ''} onClick={() => { setType('income'); setCategoryId('') }}>
                🟢 Pemasukan
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Jumlah (Rp)</label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayAmount}
              onChange={handleAmountInput}
              required
              style={{ fontSize: 20, fontFamily: 'var(--font-display)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
              <option value="">Pilih kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Catatan (opsional)</label>
            <input className="form-input" type="text" placeholder="Contoh: Makan siang di warung" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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
