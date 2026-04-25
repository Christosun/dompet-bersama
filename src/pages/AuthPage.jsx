import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const currentYear = new Date().getFullYear()

function Footer() {
  return (
    <footer style={{
      width: '100%',
      marginTop: 48,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      textAlign: 'center',
    }}>
      {/* Divider ornament */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
        width: '100%',
        maxWidth: 320,
      }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(200,169,126,0.3))' }} />
        <div style={{ fontSize: 14, color: 'var(--accent)', opacity: 0.6 }}>✦</div>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(200,169,126,0.3))' }} />
      </div>

      {/* Crafted by */}
      <p style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 400,
      }}>
        Crafted with <span style={{ color: '#f87171' }}>♥</span> by
      </p>

      {/* Developer name */}
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--accent)',
        letterSpacing: '0.04em',
      }}>
        Christosun Billy Bulu Bora
      </p>

      {/* Copyright */}
      <p style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        opacity: 0.7,
        marginTop: 2,
        letterSpacing: '0.03em',
      }}>
        © {currentYear} Dompet Bersama. All rights reserved.
      </p>
    </footer>
  )
}

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)

    try {
      if (tab === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/')
      } else {
        if (!name.trim()) throw new Error('Nama wajib diisi')
        const { error } = await signUp(email, password, name)
        if (error) throw error
        setError('')
        alert('Registrasi berhasil! Silakan login.')
        setTab('login')
      }
    } catch (err) {
      const msg = err.message || 'Terjadi kesalahan'
      if (msg.includes('Invalid login')) setError('Email atau password salah')
      else if (msg.includes('already registered')) setError('Email sudah terdaftar, silakan login')
      else if (msg.includes('Password should be')) setError('Password minimal 6 karakter')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">

        {/* Logo & tagline */}
        <div className="auth-logo">Dompet Bersama</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          color: 'var(--accent)',
          opacity: 0.7,
          marginBottom: 4,
          letterSpacing: '0.05em',
        }}>
          Eto &amp; Noni
        </div>
        <div className="auth-tagline">Kelola keuangan rumah tangga bersama pasangan</div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError('') }}
          >
            Masuk
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError('') }}
          >
            Daftar
          </button>
        </div>

        {/* Form card */}
        <div className="card">
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Contoh: Eto atau Noni"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="email@contoh.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'email' : 'new-email'}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? 'Memproses...' : tab === 'login' ? 'Masuk' : 'Daftar Sekarang'}
            </button>
          </form>
        </div>

        {tab === 'login' && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            Belum punya akun?{' '}
            <button
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}
              onClick={() => setTab('register')}
            >
              Daftar di sini
            </button>
          </p>
        )}

        <Footer />
      </div>
    </div>
  )
}