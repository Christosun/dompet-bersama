import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { LayoutDashboard, ArrowLeftRight, Tag, Target, BarChart2, LogOut, Trophy, RefreshCw, Plus } from 'lucide-react'
import TransactionModal from './TransactionModal'
import Avatar from './Avatar'

const sidebarItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { to: '/budget', icon: Target, label: 'Budget' },
  { to: '/goals', icon: Trophy, label: 'Goals & Tabungan' },
  { to: '/categories', icon: Tag, label: 'Kategori' },
  { to: '/reports', icon: BarChart2, label: 'Laporan' },
  { to: '/recurring', icon: RefreshCw, label: 'Berulang' },
]


export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  async function handleSignOut() {
    const ok = await confirm({ title: 'Keluar', message: 'Yakin ingin keluar dari aplikasi?', confirmLabel: 'Keluar' })
    if (!ok) return
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          Dompet Bersama Eto & Noni
          <span>Keuangan Rumah Tangga</span>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          {profile && (
            <div className="sidebar-profile-card">
              <Avatar name={profile.name} size={44} ring status objectPos="center 12%" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</div>
                <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                  Aktif
                </div>
              </div>
            </div>
          )}
          <button className="nav-item" onClick={handleSignOut} style={{ color: 'var(--red)', width: '100%' }}>
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="mobile-topbar">
        <div className="mobile-topbar-logo">Dompet Bersama Eto & Noni</div>
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={profile.name} size={32} ring objectPos="center 12%" />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{profile.name}</span>
            <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile FAB */}
      <button className="fab" onClick={() => setShowQuickAdd(true)} aria-label="Tambah transaksi">
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {showQuickAdd && (
        <TransactionModal
          onClose={() => setShowQuickAdd(false)}
          onSaved={() => {
            setShowQuickAdd(false)
            window.dispatchEvent(new CustomEvent('fab-transaction-saved'))
          }}
        />
      )}

      {/* Mobile Bottom Navigation — scrollable horizontal */}
      <nav className="mobile-bottom-nav">
        {sidebarItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' mobile-nav-active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
