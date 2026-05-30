import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { formatRupiah, getCurrentMonth, getMonthName } from '../lib/utils'
import Avatar from '../components/Avatar'
import {
  PlusCircle, X, Pencil, Trophy, CheckCircle, Plus,
  Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Calendar, BarChart2, Target, AlertCircle, Clock, Layers,
} from 'lucide-react'

/* ─── SQL Setup ──────────────────────────────────────────── */
const SETUP_SQL = `-- Jalankan di Supabase Dashboard → SQL Editor

-- 1. Goals
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
create policy "All can delete goals" on goals for delete using (auth.role() = 'authenticated');

-- 2. Saldo Tabungan
create table if not exists savings_account (
  id uuid primary key default gen_random_uuid(),
  initial_balance decimal default 0,
  current_balance decimal default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table savings_account enable row level security;
create policy "All can read savings_account" on savings_account for select using (auth.role() = 'authenticated');
create policy "All can insert savings_account" on savings_account for insert with check (auth.role() = 'authenticated');
create policy "All can update savings_account" on savings_account for update using (auth.role() = 'authenticated');

-- 3. Riwayat Tabungan Bulanan
create table if not exists monthly_savings (
  id uuid primary key default gen_random_uuid(),
  month int not null,
  year int not null,
  total_income decimal default 0,
  total_expense decimal default 0,
  net_savings decimal default 0,
  added_to_balance decimal default 0,
  finalized_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(month, year)
);
alter table monthly_savings enable row level security;
create policy "All can read monthly_savings" on monthly_savings for select using (auth.role() = 'authenticated');
create policy "All can insert monthly_savings" on monthly_savings for insert with check (auth.role() = 'authenticated');
create policy "All can update monthly_savings" on monthly_savings for update using (auth.role() = 'authenticated');
create policy "All can delete monthly_savings" on monthly_savings for delete using (auth.role() = 'authenticated');`

const fmt = v => v ? parseInt(String(v).replace(/\D/g, '') || '0').toLocaleString('id-ID') : ''

/* ─── GoalModal ──────────────────────────────────────────── */
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
    if (data) { ;({ error } = await supabase.from('goals').update(payload).eq('id', data.id)) }
    else { ;({ error } = await supabase.from('goals').insert(payload)) }
    setLoading(false)
    if (!error) { toast.success(data ? 'Goal diperbarui' : 'Goal dibuat'); onSaved(); onClose() }
    else toast.error('Gagal: ' + error.message)
  }

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
              onChange={e => setTarget(e.target.value.replace(/\D/g, ''))} placeholder="0" required style={{ fontSize: 18, fontWeight: 700 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Sudah Terkumpul (Rp)</label>
            <input className="form-input" type="text" inputMode="numeric" value={fmt(current)}
              onChange={e => setCurrent(e.target.value.replace(/\D/g, ''))} placeholder="0" style={{ fontSize: 18, fontWeight: 700 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Deadline (opsional)</label>
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

/* ─── ContributeModal ────────────────────────────────────── */
function ContributeModal({ goal, savingsBalance, onClose, onSaved }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [fromSavings, setFromSavings] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    const add = parseFloat(amount.replace(/\D/g, ''))
    if (!add) return
    if (fromSavings && add > (savingsBalance || 0)) { toast.error('Jumlah melebihi saldo tabungan'); return }
    setLoading(true)
    const { error: gErr } = await supabase.from('goals').update({ current_amount: (goal.current_amount || 0) + add }).eq('id', goal.id)
    if (gErr) { toast.error('Gagal: ' + gErr.message); setLoading(false); return }
    if (fromSavings) {
      await supabase.from('savings_account').update({ current_balance: savingsBalance - add, updated_at: new Date().toISOString() }).gte('current_balance', 0)
    }
    setLoading(false)
    toast.success(`+${formatRupiah(add)} ditambahkan ke "${goal.name}"${fromSavings ? ' dari saldo tabungan' : ''}`)
    onSaved(); onClose()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Nabung ke Goal</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--accent-dim)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{goal.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {formatRupiah(goal.current_amount || 0)} / {formatRupiah(goal.target_amount)}
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Jumlah (Rp)</label>
            <input className="form-input" type="text" inputMode="numeric" value={fmt(amount)}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" required autoFocus style={{ fontSize: 22, fontWeight: 700 }} />
          </div>
          {savingsBalance > 0 && (
            <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={fromSavings} onChange={e => setFromSavings(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Kurangi dari saldo tabungan</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Saldo tersedia: {formatRupiah(savingsBalance)}</div>
                </div>
              </label>
            </div>
          )}
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

/* ─── InitBalanceModal ───────────────────────────────────── */
function InitBalanceModal({ currentInitial, onClose, onSaved }) {
  const [amount, setAmount] = useState(currentInitial ? String(currentInitial) : '')

  function handleSave(e) {
    e.preventDefault()
    onSaved(parseFloat(amount.replace(/\D/g, '')) || 0)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{currentInitial > 0 ? 'Edit Saldo Awal' : 'Atur Saldo Awal'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Masukkan jumlah tabungan yang sudah dimiliki sebelum menggunakan aplikasi ini. Jumlah ini menjadi titik awal saldo tabungan bersama.
        </p>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Saldo Awal (Rp)</label>
            <input className="form-input" type="text" inputMode="numeric" value={fmt(amount)}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" autoFocus style={{ fontSize: 22, fontWeight: 700 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── FinalizeModal ──────────────────────────────────────── */
function FinalizeModal({ month, year, income, expense, loading, onClose, onConfirm }) {
  const net = income - expense
  const willAdd = Math.max(net, 0)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Tutup & Rekap Bulan</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 14 }}>
          {getMonthName(month, year)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <TrendingUp size={14} color="var(--green)" /> Total Pemasukan
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>+{formatRupiah(income)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <TrendingDown size={14} color="var(--red)" /> Total Pengeluaran
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>-{formatRupiah(expense)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: net >= 0 ? 'rgba(245,166,35,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${net >= 0 ? 'rgba(245,166,35,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)' }}>
              {net >= 0 ? '✨ Bisa Ditabung' : '⚠️ Defisit Bulan Ini'}
            </span>
            <span style={{ fontSize: 17, fontWeight: 800, color: net >= 0 ? 'var(--accent)' : 'var(--red)', letterSpacing: '-0.02em' }}>
              {net >= 0 ? '+' : ''}{formatRupiah(net)}
            </span>
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          {willAdd > 0
            ? `${formatRupiah(willAdd)} akan ditambahkan ke saldo tabungan bersama setelah dikonfirmasi.`
            : 'Bulan ini pengeluaran melebihi pemasukan. Tidak ada yang ditambahkan ke saldo tabungan, namun rekap tetap tersimpan.'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Goals() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  const [activeTab, setActiveTab] = useState('savings')
  const [savings, setSavings] = useState(null)
  const [monthlyHistory, setMonthlyHistory] = useState([])
  const [goals, setGoals] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  const { month: nowM, year: nowY } = getCurrentMonth()
  const [rekapMonth, setRekapMonth] = useState(nowM)
  const [rekapYear, setRekapYear] = useState(nowY)
  const [monthData, setMonthData] = useState({ income: 0, expense: 0 })
  const [monthDataLoading, setMonthDataLoading] = useState(false)

  const [showInitModal, setShowInitModal] = useState(false)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editGoalData, setEditGoalData] = useState(null)
  const [contributeGoal, setContributeGoal] = useState(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadMonthData(rekapMonth, rekapYear) }, [rekapMonth, rekapYear])

  async function loadAll() {
    setLoading(true)
    const [
      { data: savData, error: savErr },
      { data: histData, error: histErr },
      { data: goalsData, error: goalsErr },
      { data: profsData },
    ] = await Promise.all([
      supabase.from('savings_account').select('*').limit(1).maybeSingle(),
      supabase.from('monthly_savings').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name'),
    ])
    if (savErr?.code === '42P01' || histErr?.code === '42P01' || goalsErr?.code === '42P01') {
      setTableMissing(true); setLoading(false); return
    }
    setSavings(savData || null)
    setMonthlyHistory(histData || [])
    setGoals(goalsData || [])
    const pm = {}; (profsData || []).forEach(p => pm[p.id] = p)
    setProfiles(pm)
    setLoading(false)
  }

  async function loadMonthData(month, year) {
    setMonthDataLoading(true)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
    const { data } = await supabase.from('transactions').select('type, amount').gte('date', start).lte('date', end)
    const txs = data || []
    setMonthData({
      income: txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    })
    setMonthDataLoading(false)
  }

  async function handleSetInitialBalance(amount) {
    const totalAdded = monthlyHistory.reduce((s, m) => s + Number(m.added_to_balance), 0)
    const newBalance = amount + totalAdded
    if (savings) {
      const { error } = await supabase.from('savings_account')
        .update({ initial_balance: amount, current_balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', savings.id)
      if (error) { toast.error('Gagal: ' + error.message); return }
    } else {
      const { error } = await supabase.from('savings_account').insert({ initial_balance: amount, current_balance: amount })
      if (error) { toast.error('Gagal: ' + error.message); return }
    }
    toast.success('Saldo awal berhasil disimpan')
    loadAll()
  }

  async function handleFinalizeMonth() {
    setFinalizing(true)
    const { income, expense } = monthData
    const net = income - expense
    const addedToBalance = Math.max(net, 0)
    const existing = monthlyHistory.find(m => m.month === rekapMonth && m.year === rekapYear)
    try {
      if (existing) {
        const prevAdded = Number(existing.added_to_balance) || 0
        await supabase.from('monthly_savings').update({
          total_income: income, total_expense: expense, net_savings: net,
          added_to_balance: addedToBalance, finalized_at: new Date().toISOString()
        }).eq('id', existing.id)
        if (savings) {
          const diff = addedToBalance - prevAdded
          await supabase.from('savings_account')
            .update({ current_balance: Math.max(0, savings.current_balance + diff), updated_at: new Date().toISOString() })
            .eq('id', savings.id)
        }
      } else {
        await supabase.from('monthly_savings').insert({
          month: rekapMonth, year: rekapYear, total_income: income,
          total_expense: expense, net_savings: net, added_to_balance: addedToBalance,
        })
        if (addedToBalance > 0) {
          if (savings) {
            await supabase.from('savings_account')
              .update({ current_balance: savings.current_balance + addedToBalance, updated_at: new Date().toISOString() })
              .eq('id', savings.id)
          } else {
            await supabase.from('savings_account').insert({ initial_balance: 0, current_balance: addedToBalance })
          }
        }
      }
      toast.success(`Rekap ${getMonthName(rekapMonth, rekapYear)} berhasil disimpan!`)
      setShowFinalizeModal(false)
      loadAll()
    } catch (err) {
      toast.error('Gagal: ' + err.message)
    } finally {
      setFinalizing(false)
    }
  }

  async function deleteGoal(id, name) {
    const ok = await confirm({ title: 'Hapus Goal', message: `"${name}" akan dihapus permanen.`, confirmLabel: 'Hapus' })
    if (!ok) return
    await supabase.from('goals').delete().eq('id', id)
    toast.success('Goal dihapus'); loadAll()
  }

  async function deleteMonthlyRecord(rec) {
    const label = `${getMonthName(rec.month, rec.year)}`
    const ok = await confirm({ title: 'Hapus Rekap', message: `Rekap ${label} akan dihapus. Saldo tabungan akan disesuaikan.`, confirmLabel: 'Hapus' })
    if (!ok) return
    if (savings && rec.added_to_balance > 0) {
      await supabase.from('savings_account')
        .update({ current_balance: Math.max(0, savings.current_balance - rec.added_to_balance), updated_at: new Date().toISOString() })
        .eq('id', savings.id)
    }
    await supabase.from('monthly_savings').delete().eq('id', rec.id)
    toast.success('Rekap dihapus'); loadAll()
  }

  function prevMonth() {
    if (rekapMonth === 1) { setRekapMonth(12); setRekapYear(y => y - 1) }
    else setRekapMonth(m => m - 1)
  }
  function nextMonth() {
    if (rekapMonth === nowM && rekapYear === nowY) return
    if (rekapMonth === 12) { setRekapMonth(1); setRekapYear(y => y + 1) }
    else setRekapMonth(m => m + 1)
  }

  const isCurrentMonth = rekapMonth === nowM && rekapYear === nowY
  const finalizedRecord = monthlyHistory.find(m => m.month === rekapMonth && m.year === rekapYear)
  const net = monthData.income - monthData.expense
  const savingRate = monthData.income > 0 ? Math.min(Math.round(Math.max(net, 0) / monthData.income * 100), 100) : 0
  const totalAdded = monthlyHistory.reduce((s, m) => s + Number(m.added_to_balance), 0)

  const activeGoals = goals.filter(g => (g.current_amount || 0) < g.target_amount)
  const completedGoals = goals.filter(g => (g.current_amount || 0) >= g.target_amount)

  // ── Warn if last month not finalized ─────────────────────
  const lastMonthDate = new Date(nowY, nowM - 2, 1)
  const lastM = lastMonthDate.getMonth() + 1
  const lastY = lastMonthDate.getFullYear()
  const lastMonthFinalized = monthlyHistory.some(m => m.month === lastM && m.year === lastY)

  function GoalCard({ g }) {
    const pct = g.target_amount > 0 ? Math.min(Math.round((g.current_amount || 0) / g.target_amount * 100), 100) : 0
    const done = pct >= 100
    const remaining = Math.max(g.target_amount - (g.current_amount || 0), 0)
    const creator = profiles[g.user_id]
    let daysLeft = null
    if (g.deadline && !done) daysLeft = Math.ceil((new Date(g.deadline + 'T00:00:00') - new Date()) / 86400000)
    const isUrgent = daysLeft !== null && daysLeft <= 30

    return (
      <div className="card card-sm" style={{ borderLeft: `3px solid ${done ? 'var(--green)' : 'var(--accent)'}`, transition: 'border-color 0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: done ? 'var(--green-dim)' : 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {done ? <CheckCircle size={22} color="var(--green)" /> : <Trophy size={22} color="var(--accent)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{g.name}</div>
                {creator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <Avatar name={creator.name} size={16} tooltip />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{creator.name.split(' ')[0]}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: done ? 'var(--green)' : 'var(--accent)', flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
            </div>

            {/* Amounts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
              <span>{formatRupiah(g.current_amount || 0)} <span style={{ color: 'var(--text-sub)' }}>dari</span> {formatRupiah(g.target_amount)}</span>
              {daysLeft !== null && (
                <span style={{ color: isUrgent ? 'var(--red)' : 'var(--text-muted)', fontWeight: isUrgent ? 600 : 400 }}>
                  {daysLeft > 0 ? `⏱ ${daysLeft} hari lagi` : '🔴 Jatuh tempo!'}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="budget-bar-track" style={{ height: 8, borderRadius: 99, marginBottom: 6 }}>
              <div className="budget-bar-fill" style={{ width: `${pct}%`, background: done ? 'var(--green)' : 'var(--gold-gradient)', borderRadius: 99, transition: 'width 0.5s ease' }} />
            </div>

            {/* Footer */}
            {!done && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span>Sisa: <strong style={{ color: 'var(--text-sub)' }}>{formatRupiah(remaining)}</strong></span>
                {g.deadline && <span>Deadline: <strong style={{ color: 'var(--text-sub)' }}>{new Date(g.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>}
              </div>
            )}
            {done && <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>🎉 Target tercapai!</div>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
            {!done && (
              <button className="btn btn-sm btn-primary" onClick={() => setContributeGoal(g)} style={{ fontSize: 12, padding: '5px 10px', gap: 4 }}>
                <Plus size={12} strokeWidth={2.5} /> Nabung
              </button>
            )}
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { setEditGoalData(g); setShowGoalModal(true) }}><Pencil size={12} /></button>
              <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteGoal(g.id, g.name)}><X size={12} /></button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Table missing ───────────────────────────────────────── */
  if (tableMissing) return (
    <div>
      <div className="page-header"><h1 className="page-title">Tabungan & Goals</h1><p className="page-sub">Setup tabel database terlebih dahulu</p></div>
      <div className="card">
        <div className="section-title" style={{ color: 'var(--accent)' }}>Setup Diperlukan</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Jalankan SQL berikut di <strong style={{ color: 'var(--text)' }}>Supabase Dashboard → SQL Editor</strong>:</p>
        <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 11.5, color: 'var(--text-sub)', overflow: 'auto', lineHeight: 1.7 }}>{SETUP_SQL}</pre>
        <button className="btn btn-primary" onClick={loadAll} style={{ marginTop: 16 }}>Coba Lagi</button>
      </div>
    </div>
  )

  /* ── Main Render ─────────────────────────────────────────── */
  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Tabungan & Goals</h1>
          <p className="page-sub">Rekap bulanan, saldo bersama, dan target keuangan</p>
        </div>
        {activeTab === 'goals' && (
          <button className="btn btn-primary" onClick={() => { setEditGoalData(null); setShowGoalModal(true) }}>
            <PlusCircle size={15} /> Buat Goal
          </button>
        )}
      </div>

      {/* Banner: last month unfinalized */}
      {!loading && !lastMonthFinalized && monthlyHistory.length >= 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 12, marginBottom: 20, cursor: 'pointer' }}
          onClick={() => { setActiveTab('savings'); setRekapMonth(lastM); setRekapYear(lastY) }}>
          <AlertCircle size={15} color="#fbbf24" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
            Rekap <strong style={{ color: 'var(--text)' }}>{getMonthName(lastM, lastY)}</strong> belum ditutup — klik untuk rekap sekarang
          </span>
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', background: 'var(--bg-card2)', borderRadius: 12, padding: 4, marginBottom: 24, border: '1px solid var(--border)', gap: 4 }}>
        {[
          { key: 'savings', icon: Wallet, label: 'Tabungan' },
          { key: 'goals', icon: Target, label: 'Goals' },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s',
              background: activeTab === key ? 'var(--bg-card)' : 'transparent',
              color: activeTab === key ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: activeTab === key ? '0 1px 8px rgba(0,0,0,0.3)' : 'none',
            }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          {/* ══ SAVINGS TAB ═══════════════════════════════════════════ */}
          {activeTab === 'savings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Saldo Hero Card */}
              <div style={{ background: 'linear-gradient(135deg, #1a1508 0%, #1e1a0e 40%, #141108 100%)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 20, padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
                {/* Background glow */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(245,166,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wallet size={16} color="var(--accent)" />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(245,166,35,0.7)' }}>Saldo Tabungan</span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowInitModal(true)} style={{ fontSize: 11, gap: 5, padding: '5px 10px' }}>
                      <Pencil size={11} /> Edit Saldo Awal
                    </button>
                  </div>

                  {/* Balance amount */}
                  <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 20, lineHeight: 1.1 }}>
                    {savings ? formatRupiah(savings.current_balance) : 'Rp 0'}
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(245,166,35,0.1)' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(245,166,35,0.5)', marginBottom: 4 }}>Saldo Awal</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-sub)' }}>{formatRupiah(savings?.initial_balance || 0)}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 120, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.15)' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(74,222,128,0.6)', marginBottom: 4 }}>Total Ditabung</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>+{formatRupiah(totalAdded)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>dari {monthlyHistory.filter(m => m.added_to_balance > 0).length} bulan</div>
                    </div>
                  </div>

                  {/* Setup prompt if no savings */}
                  {!savings && (
                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,166,35,0.08)', borderRadius: 10, border: '1px dashed rgba(245,166,35,0.3)' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 8 }}>Belum ada saldo awal. Atur saldo awal tabungan bersama Eto & Noni.</div>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowInitModal(true)}>
                        <Wallet size={13} /> Atur Saldo Awal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Rekap Bulan Card */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BarChart2 size={14} color="var(--accent)" />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Rekap Bulanan</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={14} /></button>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 110, textAlign: 'center', color: 'var(--text)' }}>{getMonthName(rekapMonth, rekapYear)}</span>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={nextMonth} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}><ChevronRight size={14} /></button>
                  </div>
                </div>

                {/* Rekap body */}
                <div style={{ padding: '20px' }}>
                  {monthDataLoading ? <div className="spinner" style={{ margin: '10px auto' }} /> : (
                    <>
                      {/* Income/Expense rows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.12)', borderRadius: 10 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingUp size={13} color="var(--green)" /> Pemasukan
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>+{formatRupiah(monthData.income)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 10 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingDown size={13} color="var(--red)" /> Pengeluaran
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>-{formatRupiah(monthData.expense)}</span>
                        </div>

                        {/* Net savings result */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', background: net >= 0 ? 'rgba(245,166,35,0.07)' : 'rgba(248,113,113,0.07)', border: `1px solid ${net >= 0 ? 'rgba(245,166,35,0.22)' : 'rgba(248,113,113,0.22)'}`, borderRadius: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)' }}>
                            {net >= 0 ? '✨ Bisa Ditabung' : '⚠️ Defisit'}
                          </span>
                          <span style={{ fontSize: 17, fontWeight: 800, color: net >= 0 ? 'var(--accent)' : 'var(--red)', letterSpacing: '-0.02em' }}>
                            {net >= 0 ? '+' : ''}{formatRupiah(net)}
                          </span>
                        </div>
                      </div>

                      {/* Saving rate bar */}
                      {monthData.income > 0 && net > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Saving Rate</span>
                            <span style={{ fontWeight: 700, color: savingRate >= 30 ? 'var(--green)' : 'var(--accent)' }}>{savingRate}%</span>
                          </div>
                          <div className="budget-bar-track" style={{ height: 7, borderRadius: 99 }}>
                            <div className="budget-bar-fill" style={{ width: `${savingRate}%`, background: savingRate >= 30 ? 'var(--green)' : 'var(--gold-gradient)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      )}

                      {/* Status & action */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {finalizedRecord ? (
                            <>
                              <CheckCircle size={13} color="var(--green)" />
                              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                                Sudah direkap · +{formatRupiah(finalizedRecord.added_to_balance)} ke tabungan
                              </span>
                            </>
                          ) : isCurrentMonth ? (
                            <>
                              <Clock size={13} color="var(--accent)" />
                              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>Bulan sedang berjalan</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={13} color="#fbbf24" />
                              <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>Belum direkap</span>
                            </>
                          )}
                        </div>
                        <button className="btn btn-primary btn-sm"
                          onClick={() => setShowFinalizeModal(true)}
                          style={{ fontSize: 12 }}
                          disabled={monthData.income === 0 && monthData.expense === 0}>
                          {finalizedRecord ? 'Perbarui Rekap' : 'Tutup & Simpan Rekap'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Monthly History */}
              {monthlyHistory.length > 0 && (
                <div>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={11} /> Riwayat Bulanan
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {monthlyHistory.map(rec => {
                      const recNet = rec.net_savings
                      return (
                        <div key={rec.id} className="card card-sm" style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: recNet >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Calendar size={16} color={recNet >= 0 ? 'var(--green)' : 'var(--red)'} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{getMonthName(rec.month, rec.year)}</div>
                              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--green)' }}>↑ {formatRupiah(rec.total_income)}</span>
                                <span style={{ color: 'var(--red)' }}>↓ {formatRupiah(rec.total_expense)}</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: recNet >= 0 ? 'var(--green)' : 'var(--red)', letterSpacing: '-0.02em' }}>
                                {recNet >= 0 ? '+' : ''}{formatRupiah(recNet)}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                {rec.added_to_balance > 0 ? `+${formatRupiah(rec.added_to_balance)} ke saldo` : 'tidak ditabung'}
                              </div>
                            </div>
                            <button className="btn btn-icon btn-danger btn-sm" onClick={() => deleteMonthlyRecord(rec)} style={{ flexShrink: 0 }}>
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {monthlyHistory.length === 0 && !loading && (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <div className="icon"><BarChart2 size={40} strokeWidth={1.2} /></div>
                  <h3>Belum ada riwayat tabungan</h3>
                  <p>Tutup bulan pertama untuk mulai melacak tabungan bersama</p>
                </div>
              )}
            </div>
          )}

          {/* ══ GOALS TAB ════════════════════════════════════════════ */}
          {activeTab === 'goals' && (
            <div>
              {goals.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><Trophy size={44} strokeWidth={1.2} /></div>
                  <h3>Belum ada goals</h3>
                  <p>Buat target keuangan pertama seperti dana darurat atau liburan impian</p>
                  <button className="btn btn-primary" onClick={() => { setEditGoalData(null); setShowGoalModal(true) }} style={{ marginTop: 16 }}>
                    <PlusCircle size={15} /> Buat Goal Pertama
                  </button>
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
                      <div className="section-title">Tercapai 🎉 ({completedGoals.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {completedGoals.map(g => <GoalCard key={g.id} g={g} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showGoalModal && (
        <GoalModal data={editGoalData} onClose={() => { setShowGoalModal(false); setEditGoalData(null) }} onSaved={loadAll} />
      )}
      {contributeGoal && (
        <ContributeModal goal={contributeGoal} savingsBalance={savings?.current_balance || 0}
          onClose={() => setContributeGoal(null)} onSaved={loadAll} />
      )}
      {showInitModal && (
        <InitBalanceModal currentInitial={savings?.initial_balance || 0}
          onClose={() => setShowInitModal(false)} onSaved={handleSetInitialBalance} />
      )}
      {showFinalizeModal && (
        <FinalizeModal month={rekapMonth} year={rekapYear}
          income={monthData.income} expense={monthData.expense}
          loading={finalizing} onClose={() => setShowFinalizeModal(false)} onConfirm={handleFinalizeMonth} />
      )}
    </div>
  )
}
