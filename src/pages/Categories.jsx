import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { PlusCircle, Pencil, Trash2, X, ArrowDownLeft, ArrowUpRight, Layers } from 'lucide-react'
import { CategoryIcon, CATEGORY_ICON_MAP, CATEGORY_ICON_LIST, migrateIconName } from '../components/CategoryIcon'
import { SkeletonCategoryList } from '../components/Skeleton'

const COLORS = ['#f5a623','#4ade80','#60a5fa','#f472b6','#a78bfa','#ef4444','#06b6d4','#fbbf24','#f97316','#84cc16','#34d399','#e879f9']

function CategoryModal({ data, onClose, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(data?.name || '')
  const [icon, setIcon] = useState(data?.icon || 'Package')
  const [color, setColor] = useState(data?.color || '#f5a623')
  const [type, setType] = useState(data?.type || 'expense')
  const [loading, setLoading] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const payload = { user_id: user.id, name: name.trim(), icon, color, type }
    let error
    if (data) {
      ;({ error } = await supabase.from('categories').update(payload).eq('id', data.id))
    } else {
      ;({ error } = await supabase.from('categories').insert(payload))
    }
    setLoading(false)
    if (!error) {
      toast.success(data ? 'Kategori diperbarui' : 'Kategori berhasil dibuat')
      onSaved(); onClose()
    } else {
      toast.error('Gagal: ' + error.message)
    }
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
              <button type="button" className={type === 'expense' ? 'active-expense' : ''} onClick={() => setType('expense')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><ArrowDownLeft size={13} /> Pengeluaran</button>
              <button type="button" className={type === 'income' ? 'active-income' : ''} onClick={() => setType('income')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><ArrowUpRight size={13} /> Pemasukan</button>
              <button type="button" className={type === 'both' ? 'active-income' : ''} onClick={() => setType('both')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Layers size={13} /> Keduanya</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 196, overflowY: 'auto', padding: '2px 0' }}>
              {CATEGORY_ICON_LIST.map(iconName => {
                const IconComp = CATEGORY_ICON_MAP[iconName]
                const isActive = icon === iconName
                return (
                  <button key={iconName} type="button" onClick={() => setIcon(iconName)} title={iconName} style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: `2px solid ${isActive ? color : 'var(--border)'}`,
                    background: isActive ? `${color}20` : 'var(--bg-card2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.12s', flexShrink: 0,
                  }}>
                    <IconComp size={15} style={{ color: isActive ? color : 'var(--text-sub)' }} />
                  </button>
                )
              })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Warna</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c,
                  border: `2px solid ${color === c ? 'white' : 'transparent'}`,
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
  const toast = useToast()
  const confirm = useConfirm()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('type').order('name')
    const cats = data || []
    setCategories(cats)
    setLoading(false)
    migrateEmojiIcons(cats)
  }

  async function migrateEmojiIcons(cats) {
    const toUpdate = cats
      .filter(c => !CATEGORY_ICON_MAP[c.icon])
      .map(c => ({ id: c.id, newIcon: migrateIconName(c.icon) }))
      .filter(c => c.newIcon)

    if (toUpdate.length === 0) return

    await Promise.all(
      toUpdate.map(({ id, newIcon }) =>
        supabase.from('categories').update({ icon: newIcon }).eq('id', id)
      )
    )

    const { data: fresh } = await supabase.from('categories').select('*').order('type').order('name')
    if (fresh) setCategories(fresh)
  }

  async function deleteCategory(id, name) {
    const ok = await confirm({ title: 'Hapus Kategori', message: `Kategori "${name}" akan dihapus. Transaksi yang menggunakan kategori ini tidak ikut terhapus.`, confirmLabel: 'Hapus' })
    if (!ok) return
    await supabase.from('categories').delete().eq('id', id)
    toast.success('Kategori dihapus')
    loadCategories()
  }

  const expenseCats = categories.filter(c => c.type === 'expense' || c.type === 'both')
  const incomeCats = categories.filter(c => c.type === 'income' || c.type === 'both')

  function CatGroup({ title, items }) {
    return (
      <div>
        <div className="section-title">{title}</div>
        {loading ? <SkeletonCategoryList count={4} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {items.map(c => (
              <div key={c.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${c.color}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CategoryIcon icon={c.icon} size={17} color={c.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  {c.is_default && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Default</div>}
                </div>
                {c.user_id === user.id && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setEditData(c); setShowModal(true) }}><Pencil size={12} /></button>
                    {!c.is_default && <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteCategory(c.id, c.name)}><Trash2 size={12} /></button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <CatGroup title="Pengeluaran" items={expenseCats} />
        <CatGroup title="Pemasukan" items={incomeCats} />
      </div>

      {showModal && (
        <CategoryModal data={editData} onClose={() => { setShowModal(false); setEditData(null) }} onSaved={loadCategories} />
      )}
    </div>
  )
}
