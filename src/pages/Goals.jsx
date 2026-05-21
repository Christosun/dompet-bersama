import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { formatRupiah } from '../lib/utils'
import { getInitials, getAvatarColor } from '../lib/utils'
import { PlusCircle, X, Pencil, Trophy, CheckCircle, Plus } from 'lucide-react'

const SETUP_SQL = `-- Jalankan di Supabase Dashboard → SQL Editor
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  target_amount decimal not null,
  current_amount decimal default 0,
  deadline date,
  created_at timestamptz default now()
);
alter table goals enable row level security;
create policy "All can read goals" on goals for select using (auth.role() = 'authenticated');
create policy "Users insert goals" on goals for insert with check (auth.uid() = user_id);
create policy "All can update goals" on goals for update using (auth.role() = 'authenticated');
create policy "All can delete goals" on goals for delete using (auth.role() = 'authenticated');`

function GoalModal({ data, onClose, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(data?.name || '')
  const [target, setTarget] = useState(data?.target_amount ? String(data.target_amount) : '')
  const [current, setCurrent] = useState(data?.current_amount ? String(data.current_amount) : '')
  const [deadline, setDeadline] = useState(data?.deadline || '')
  const [loading, setLoading] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!name || !target) return
    setLoading(true)
    const payload = {
      user_id: user.id,
      name: name.trim(),
      target_amount: parseFloat(target.replace(/\D/g, '')),
      current_amount: parseFloat(current.replace(/\D/g, '')) || 0,
      deadline: deadline || null,
    }
    let error
    if (data) {
      ;({ error } = await supabase.from('goals').update(payload).eq('id', data.id))
    } else {
      ;({ error } = await supabase.from('goals').insert(payload))
    }
    setLoading(false)
    if (!error) { toast.success(data ? 'Goal diperbarui' : 'Goal berhasil dibuat'); onSaved(); onClose() }
    else toast.error('Gagal: ' + error.message)
  }

  const fmt = v => v ? parseInt(v.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{data ? 'Edit Goal' : 'Goal Baru'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Goal</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Dana darurat, Liburan" required />
          </div>
          <div className="form-group">
            <label className="form-label">Target (Rp)</label>
            <input className="form-input" type="text" inputMode="numeric" value={fmt(target)}
              onChange={e => setTarget(e.target.value.replace(/\D/g, ''))} placeholder="0" required
              style={{ fontSize: 18, fontFamily: 'var(--font-display)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Sudah Terkumpul (Rp)</label>
            <input className="form-input" type="text" inputMode="numeric" value={fmt(current)}
              onChange={e => setCurrent(e.target.value.replace(/\D/g, ''))} placeholder="0"
              style={{ fontSize: 18, fontFamily: 'var(--font-display)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Target Tanggal (opsional)</label>
            <input className="form-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
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

function ContributeModal({ goal, onClose, onSaved }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    const add = parseFloat(amount.replace(/\D/g, ''))
    if (!add) return
    setLoading(true)
    const newAmt = (goal.current_amount || 0) + add
    const { error } = await supabase.from('goals').update({ current_amount: newAmt }).eq('id', goal.id)
    setLoading(false)
    if (!error) { toast.success(`+${formatRupiah(add)} ditambahkan ke "${goal.name}"`); onSaved(); onClose() }
    else toast.error('Gagal: ' + error.message)
  }

  const fmt = v => v ? parseInt(v.replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Tambah Tabungan</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          {goal.name} · {formatRupiah(goal.current_amount || 0)} / {formatRupiah(goal.target_amount)}
        </p>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Jumlah (Rp)</label>
            <input className="form-input" type="text" inputMode="numeric" value={fmt(amount)}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" required autoFocus
              style={{ fontSize: 22, fontFamily: 'var(--font-display)' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Goals() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [goals, setGoals] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const [contribute, setContribute] = useState(null)

  useEffect(() => { loadGoals() }, [])

  async function loadGoals() {
    setLoading(true)
    // Ambil semua goals (bersama) + profiles untuk tampilkan siapa yang buat
    const [{ data, error }, { data: profs }] = await Promise.all([
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name'),
    ])
    if (error?.code === '42P01') {
      setTableMissing(true)
    } else {
      setGoals(data || [])
      const pm = {}
      ;(profs || []).forEach(p => pm[p.id] = p)
      setProfiles(pm)
    }
    setLoading(false)
  }

  async function deleteGoal(id, name) {
    const ok = await confirm({ title: 'Hapus Goal', message: `"${name}" akan dihapus permanen.`, confirmLabel: 'Hapus' })
    if (!ok) return
    await supabase.from('goals').delete().eq('id', id)
    toast.success('Goal dihapus')
    loadGoals()
  }

  const activeGoals = goals.filter(g => (g.current_amount || 0) < g.target_amount)
  const completedGoals = goals.filter(g => (g.current_amount || 0) >= g.target_amount)

  function GoalCard({ g }) {
    const pct = g.target_amount > 0 ? Math.min(Math.round((g.current_amount || 0) / g.target_amount * 100), 100) : 0
    const done = pct >= 100
    const remaining = Math.max(g.target_amount - (g.current_amount || 0), 0)
    const creator = profiles[g.user_id]

    let daysLeft = null
    if (g.deadline && !done) {
      daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / 86400000)
    }

    return (
      <div className="card card-sm" style={{ borderLeft: `3px solid ${done ? 'var(--green)' : 'var(--accent)'}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: done ? 'var(--green-dim)' : 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {done ? <CheckCircle size={20} color="var(--green)" /> : <Trophy size={20} color="var(--accent)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{g.name}</span>
                {/* Tampilkan siapa yang membuat */}
                {creator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <div className="avatar" style={{ width: 14, height: 14, fontSize: 7, background: getAvatarColor(creator.name), flexShrink: 0 }}>
                      {getInitials(creator.name)}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{creator.name.split(' ')[0]}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: done ? 'var(--green)' : 'var(--accent)', flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              {formatRupiah(g.current_amount || 0)} dari {formatRupiah(g.target_amount)}
              {daysLeft !== null && (
                <span style={{ marginLeft: 8, color: daysLeft < 30 ? 'var(--red)' : 'var(--text-muted)' }}>
                  · {daysLeft > 0 ? `${daysLeft} hari lagi` : 'Jatuh tempo!'}
                </span>
              )}
            </div>
            <div className="budget-bar-track" style={{ height: 8 }}>
              <div className="budget-bar-fill" style={{ width: `${pct}%`, background: done ? 'var(--green)' : 'var(--gold-gradient)' }} />
            </div>
            {!done && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Sisa: <span style={{ color: 'var(--text-sub)' }}>{formatRupiah(remaining)}</span></div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {!done && (
              <button className="btn btn-sm btn-primary" onClick={() => setContribute(g)} style={{ fontSize: 12, padding: '5px 10px', gap: 4 }}>
                <Plus size={12} strokeWidth={2.5} />Nabung
              </button>
            )}
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setEditData(g); setShowModal(true) }}><Pencil size={12} /></button>
              <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteGoal(g.id, g.name)}><X size={12} /></button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (tableMissing) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tabungan & Goals</h1>
        <p className="page-sub">Setup tabel database terlebih dahulu</p>
      </div>
      <div className="card">
        <div className="section-title" style={{ color: 'var(--accent)' }}>Setup Diperlukan</div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Jalankan SQL berikut di <strong style={{ color: 'var(--text)' }}>Supabase Dashboard → SQL Editor</strong>:</p>
        <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 12, color: 'var(--text-sub)', overflow: 'auto', lineHeight: 1.6 }}>{SETUP_SQL}</pre>
        <button className="btn btn-primary" onClick={loadGoals} style={{ marginTop: 16 }}>Coba Lagi</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Tabungan & Goals</h1>
          <p className="page-sub">Rencanakan dan pantau target keuangan bersama</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditData(null); setShowModal(true) }}>
          <PlusCircle size={16} /> Buat Goal
        </button>
      </div>

      {loading ? <div className="spinner" /> : goals.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><Trophy size={44} strokeWidth={1.2} /></div>
          <h3>Belum ada goal</h3>
          <p>Buat goal pertama seperti dana darurat atau liburan impian</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {activeGoals.length > 0 && (
            <div>
              <div className="section-title">Sedang Berjalan ({activeGoals.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeGoals.map(g => <GoalCard key={g.id} g={g} />)}
              </div>
            </div>
          )}
          {completedGoals.length > 0 && (
            <div>
              <div className="section-title">Tercapai ({completedGoals.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {completedGoals.map(g => <GoalCard key={g.id} g={g} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <GoalModal data={editData} onClose={() => { setShowModal(false); setEditData(null) }} onSaved={loadGoals} />
      )}
      {contribute && (
        <ContributeModal goal={contribute} onClose={() => setContribute(null)} onSaved={loadGoals} />
      )}
    </div>
  )
}
