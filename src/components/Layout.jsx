import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getInitials, getAvatarColor } from '../lib/utils'
import { LayoutDashboard, ArrowLeftRight, Tag, Target, BarChart2, LogOut } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { to: '/budget', icon: Target, label: 'Budget' },
  { to: '/categories', icon: Tag, label: 'Kategori' },
  { to: '/reports', icon: BarChart2, label: 'Laporan' },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    if (!confirm('Yakin ingin keluar?')) return
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
          {navItems.map(({ to, icon: Icon, label, end }) => (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8 }}>
              <div className="avatar" style={{ background: getAvatarColor(profile.name) }}>
                {getInitials(profile.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aktif</div>
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
            <div className="avatar" style={{ background: getAvatarColor(profile.name), width: 32, height: 32, fontSize: 12 }}>
              {getInitials(profile.name)}
            </div>
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

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {navItems.map(({ to, icon: Icon, label, end }) => (
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
