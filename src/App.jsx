import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'

// Dashboard dan Transactions selalu dibutuhkan — load langsung
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'

// Reports berat (recharts ComposedChart) — lazy load
// Hanya di-download saat user buka halaman Laporan
const Reports = lazy(() => import('./pages/Reports'))
const Categories = lazy(() => import('./pages/Categories'))
const Budget = lazy(() => import('./pages/Budget'))

// Loading fallback ringan
function PageLoader() {
  return <div className="spinner" style={{ marginTop: '30vh' }} />
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return user ? children : <Navigate to="/auth" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        {/* Core pages — no lazy */}
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />

        {/* Heavy pages — lazy loaded */}
        <Route path="categories" element={
          <Suspense fallback={<PageLoader />}>
            <Categories />
          </Suspense>
        } />
        <Route path="budget" element={
          <Suspense fallback={<PageLoader />}>
            <Budget />
          </Suspense>
        } />
        <Route path="reports" element={
          <Suspense fallback={<PageLoader />}>
            <Reports />
          </Suspense>
        } />
      </Route>
    </Routes>
  )
}