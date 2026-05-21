import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { formatRupiah } from '../lib/utils'
import { PlusCircle, X, Pencil, RefreshCw, Pause, Play } from 'lucide-react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { CategoryIcon } from '../components/CategoryIcon'

const SETUP_SQL = `-- Jalankan di Supabase Dashboard → SQL Editor
create table if not exists recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null check (type in ('expense','income')),
  amount decimal not null,
  category_id uuid references categories,
  note text,
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  start_date date not null,
  next_date date not null,
  active boolean default true,
  created_at timestamptz default now()
);
alter table recurring_transactions enable row level security;
create policy "Users manage own recurring" on recurring_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);`

const FREQ_LABEL = { daily: 'Setiap hari', weekly: 'Setiap minggu', monthly: 'Setiap bulan' }

function RecurringModal({ data, categories, onClose, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [type, setType] = useState(data?.type || 'expense')
  const [amount, setAmount] = useState(data?.amount ? String(data.amount) : '')
  const [categoryId, setCategoryId] = useState(data?.category_id || '')
  const [note, setNote] = useState(data?.note || '')
  const [frequency, setFrequency] = useState(data?.frequency || 'monthly')
  const [startDate, setStartDate] = useState(data?.start_date || new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const filteredCats = categories.filter(c => c.type === type || c.type === 'both')

  async function handleSave(e) {
    e.preventDefault()
    if (!amount || !categoryId) return
    setLoading(true)
    const payload = {
      user_id: user.id,
      type,
      amount: parseFloat(amount.replace(/\D/g, '')),
      category_id: categoryId,
      note: note.trim() || null,
      frequency,
      start_date: startDate,
      next_date: startDate,
      active: true,
    }
    let error
    if (data) {
      ;({ error } = await supabase.from('recurring_transactions').update(payload).eq('id', data.id))
    } else {
      ;({ error } = await supabase.from('recurring_transactions').insert(payload))
    }
    setLoading(false)
    if (!error) { toast.success(data ? 'Transaksi berulang diperbarui' : 'Transaksi berulang ditambahkan'); onSaved(); onClose() }
    else toast.error('Gagal: ' + error.message)
  }

  const fmt = v => v ? parseInt(v.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{data ? 'Edit Transaksi Berulang' : 'Tambah Transaksi Berulang'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Jenis</label>
            <div className="type-toggle">
              <button type="button" className={type === 'expense' ? 'active-expense' : ''} onClick={() => { setType('expense'); setCategoryId('') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ArrowDownLeft size={14} /> Pengeluaran
              </button>
              <button type="button" className={type === 'income' ? 'active-income' : ''} onClick={() => { setType('income'); setCategoryId('') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ArrowUpRight size={14} /> Pemasukan
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Jumlah (Rp)</label>
            <input className="form-input" type="text" inputMode="numeric" placeholder="0" value={fmt(amount)}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} required
              style={{ fontSize: 20, fontFamily: 'var(--font-display)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
              <option value="">Pilih kategori</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Frekuensi</label>
            <select className="form-input" value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="daily">Setiap Hari</option>
              <option value="weekly">Setiap Minggu</option>
              <option value="monthly">Setiap Bulan</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Mulai Dari</label>
            <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Catatan (opsional)</label>
            <input className="form-input" type="text" placeholder="Contoh: Cicilan, langganan" value={note} onChange={e => setNote(e.target.value)} />
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

export default function Recurring() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: recs, error }, { data: cats }] = await Promise.all([
      supabase.from('recurring_transactions').select('*, categories(name, icon, color)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ])
    if (error?.code === '42P01') setTableMissing(true)
    else setItems(recs || [])
    setCategories(cats || [])
    setLoading(false)
  }

  async function toggleActive(item) {
    await supabase.from('recurring_transactions').update({ active: !item.active }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
    toast.info(item.active ? 'Transaksi dinonaktifkan' : 'Transaksi diaktifkan')
  }

  async function deleteItem(id) {
    const ok = await confirm({ title: 'Hapus Transaksi Berulang', message: 'Item ini akan dihapus dari daftar berulang.', confirmLabel: 'Hapus' })
    if (!ok) return
    await supabase.from('recurring_transactions').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Dihapus')
  }

  if (tableMissing) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transaksi Berulang</h1>
        <p className="page-sub">Setup tabel database terlebih dahulu</p>
      </div>
      <div className="card">
        <div className="section-title" style={{ color: 'var(--accent)' }}>Setup Diperlukan</div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Jalankan SQL berikut di <strong style={{ color: 'var(--text)' }}>Supabase Dashboard → SQL Editor</strong>:</p>
        <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 12, color: 'var(--text-sub)', overflow: 'auto', lineHeight: 1.6 }}>
          {SETUP_SQL}
        </pre>
        <button className="btn btn-primary" onClick={loadAll} style={{ marginTop: 16 }}>Coba Lagi</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Transaksi Berulang</h1>
          <p className="page-sub">Kelola cicilan, langganan, dan pemasukan rutin</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setShowModal(true) }}>
          <PlusCircle size={16} /> Tambah
        </button>
      </div>

      {loading ? <div className="spinner" /> : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><RefreshCw size={44} strokeWidth={1.2} /></div>
          <h3>Belum ada transaksi berulang</h3>
          <p>Contoh: cicilan bulanan, langganan streaming, gaji</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} className="card card-sm" style={{ opacity: item.active ? 1 : 0.55, transition: 'opacity 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${item.categories?.color || '#6b7280'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CategoryIcon icon={item.categories?.icon} size={18} color={item.categories?.color || 'var(--text-muted)'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>{item.categories?.name || 'Kategori'}</span>
                    <span style={{ fontWeight: 600, fontSize: 15, color: item.type === 'income' ? 'var(--green)' : 'var(--text)' }}>
                      {item.type === 'income' ? '+' : '-'}{formatRupiah(item.amount)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {FREQ_LABEL[item.frequency]}
                    {item.note && ` · ${item.note}`}
                    {!item.active && <span style={{ color: 'var(--red)', marginLeft: 6 }}>· Nonaktif</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => toggleActive(item)} title={item.active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {item.active ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setEditData(item); setShowModal(true) }}><Pencil size={13} /></button>
                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteItem(item.id)}><X size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RecurringModal data={editData} categories={categories}
          onClose={() => { setShowModal(false); setEditData(null) }} onSaved={loadAll} />
      )}
    </div>
  )
}
