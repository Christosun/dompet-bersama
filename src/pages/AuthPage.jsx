import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')
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
        <div className="auth-logo">Dompet Bersama Eto & Noni</div>
        <div className="auth-tagline">Kelola keuangan rumah tangga bersama pasangan</div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError('') }}>Masuk</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError('') }}>Daftar</button>
        </div>

        <div className="card">
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input className="form-input" type="text" placeholder="Contoh: Budi atau Siti" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="email@contoh.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Minimal 6 karakter" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? 'Memproses...' : tab === 'login' ? 'Masuk' : 'Daftar Sekarang'}
            </button>
          </form>
        </div>

        {tab === 'login' && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            Belum punya akun?{' '}
            <button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }} onClick={() => setTab('register')}>
              Daftar di sini
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
