import { useEffect, useState } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './config/firebase'
import Admin from './pages/Admin'
import AdminLogin from './pages/AdminLogin'
import CategoryPage from './pages/CategoryPage'
import EventPage from './pages/EventPage'
import ZanteLanding from './pages/ZanteLanding'

function ProtectedRoute({ user, loading, children }) {
  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0f' }} />
  if (!user) return <Navigate to="/admin/login" replace />
  return children
}

function App() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return () => unsub()
  }, [])

  const loading = user === undefined

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ZanteLanding />} />
        <Route path="/categoria/:id" element={<CategoryPage />} />
        <Route path="/eventi/:id" element={<EventPage />} />
        <Route path="/admin/login" element={
          !loading && user ? <Navigate to="/admin" replace /> : <AdminLogin />
        } />
        <Route path="/admin" element={
          <ProtectedRoute user={user} loading={loading}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
