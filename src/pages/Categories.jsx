import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { PlusCircle, Pencil, Trash2, X } from 'lucide-react'

const ICONS = ['🍽️','🚗','🛒','💊','🎬','📄','📚','📦','💼','💻','📈','🏠','👗','💰','✈️','🎮','🐾','🌿','☕','🎁','⚡','🔧','🏋️','🎓']
const COLORS = ['#f59e0b','#3b82f6','#ec4899','#10b981','#8b5cf6','#ef4444','#06b6d4','#6b7280','#c8a97e','#f97316','#84cc16','#e879f9']

function CategoryModal({ data, onClose, onSaved }) {
  const { user } = useAuth()
  const [name, setName] = useState(data?.name || '')
  const [icon, setIcon] = useState(data?.icon || '📦')
  const [color, setColor] = useState(data?.color || '#6366f1')
  const [type, setType] = useState(data?.type || 'expense')
  const [loading, setLoading] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const payload = { user_id: user.id, name: name.trim(), icon, color, type }
    let error
    if (data) {
      ({ error } = await supabase.from('categories').update(payload).eq('id', data.id))
    } else {
      ({ error } = await supabase.from('categories').insert(payload))
    }
    setLoading(false)
    if (!error) { onSaved(); onClose() }
    else alert('Gagal: ' + error.message)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{data ? 'Edit Kategori' : 'Kategori Baru'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Kategori</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nama kategori" required />
          </div>
          <div className="form-group">
            <label className="form-label">Jenis</label>
            <div className="type-toggle">
              <button type="button" className={type === 'expense' ? 'active-expense' : ''} onClick={() => setType('expense')}>🔴 Pengeluaran</button>
              <button type="button" className={type === 'income' ? 'active-income' : ''} onClick={() => setType('income')}>🟢 Pemasukan</button>
              <button type="button" className={type === 'both' ? 'active-income' : ''} onClick={() => setType('both')}>✨ Keduanya</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)} style={{
                  width: 36, height: 36, borderRadius: 8, border: `2px solid ${icon === ic ? color : 'var(--border)'}`,
                  background: icon === ic ? `${color}20` : 'var(--bg-card2)', fontSize: 18, cursor: 'pointer', transition: 'all 0.1s'
                }}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Warna</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: `2px solid ${color === c ? 'white' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.1s'
                }} />
              ))}
            </div>
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

export default function Categories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('type').order('name')
    setCategories(data || [])
    setLoading(false)
  }

  async function deleteCategory(id) {
    if (!confirm('Hapus kategori ini? Transaksi yang menggunakan kategori ini tidak akan terhapus.')) return
    await supabase.from('categories').delete().eq('id', id)
    loadCategories()
  }

  const expenseCats = categories.filter(c => c.type === 'expense' || c.type === 'both')
  const incomeCats = categories.filter(c => c.type === 'income' || c.type === 'both')

  function CatGroup({ title, items }) {
    return (
      <div>
        <div className="section-title">{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {items.map(c => (
            <div key={c.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${c.color}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {c.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                {c.is_default && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Default</div>}
              </div>
              {c.user_id === user.id && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setEditData(c); setShowModal(true) }}><Pencil size={12} /></button>
                  {!c.is_default && <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteCategory(c.id)}><Trash2 size={12} /></button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Kategori</h1>
          <p className="page-sub">Kelola kategori pengeluaran & pemasukan</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setShowModal(true) }}>
          <PlusCircle size={16} /> Tambah Kategori
        </button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <CatGroup title="Pengeluaran" items={expenseCats} />
          <CatGroup title="Pemasukan" items={incomeCats} />
        </div>
      )}

      {showModal && (
        <CategoryModal
          data={editData}
          onClose={() => { setShowModal(false); setEditData(null) }}
          onSaved={loadCategories}
        />
      )}
    </div>
  )
}
