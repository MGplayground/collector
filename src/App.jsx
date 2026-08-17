import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './components/auth/LoginScreen'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { Shell } from './components/layout/Shell'
import { CollectionPage } from './pages/CollectionPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CalendarPage } from './pages/CalendarPage'
import './styles/tokens.css'
import './styles/global.css'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <div className="loading-screen" />

  if (!session) return <LoginScreen />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Navigate to="/collection" replace />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
