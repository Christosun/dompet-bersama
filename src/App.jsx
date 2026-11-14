import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Categories from './pages/Categories'
import Budget from './pages/Budget'
import Reports from './pages/Reports'
import Goals from './pages/Goals'
import Recurring from './pages/Recurring'
import { useState, useEffect } from 'react'
import Splash from './components/Splash'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="app-loader" role="status" aria-live="polite">
      <div className="spinner" />
      <span className="app-loader-text">Memuat…</span>
    </div>
  )
  return user ? children : <Navigate to="/auth" />
}

const SPLASH_MIN_MS = 1000   // lama minimal splash tampil
const SPLASH_FADE_MS = 500   // harus sama dengan transisi di CSS

export default function App() {
  const { loading } = useAuth()
  const [minDone, setMinDone] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), SPLASH_MIN_MS)
    return () => clearTimeout(t)
  }, [])

  const showSplash = loading || !minDone

  useEffect(() => {
    if (showSplash) return
    const t = setTimeout(() => setGone(true), SPLASH_FADE_MS)
    return () => clearTimeout(t)
  }, [showSplash])

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="categories" element={<Categories />} />
            <Route path="budget" element={<Budget />} />
            <Route path="reports" element={<Reports />} />
            <Route path="goals" element={<Goals />} />
            <Route path="recurring" element={<Recurring />} />
          </Route>
        </Routes>
      </ConfirmProvider>
      {!gone && <Splash leaving={!showSplash} />}
    </ToastProvider>
  )
}
