import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './components/auth/LoginScreen'
import { ErrorBoundary, LazyChunk } from './components/ui/ErrorBoundary'
import { Shell } from './components/layout/Shell'
import { CollectionPage } from './pages/CollectionPage'
import { CalendarPage } from './pages/CalendarPage'
import { DashboardPage } from './pages/DashboardPage'
import './styles/tokens.css'
import './styles/global.css'

// The dashboard is the landing route; Analytics is the only page built on
// `recharts`, so it is fetched when that tab is first opened rather than at cold
// start. Nothing the dashboard imports may reach recharts, or the split is undone.
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage }))
)

// Resale is a whole module — form, photo manager, composer, publish panel — and
// the landing route is the dashboard, which needs only its summary maths. Same
// reasoning as Analytics: keep it out of the cold-start bundle.
const ResalePage = lazy(() =>
  import('./pages/ResalePage').then(m => ({ default: m.ResalePage }))
)

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <div className="loading-screen" />

  if (!session) return <LoginScreen />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route
              path="/resale"
              element={
                <LazyChunk
                  loading={<p className="item-list-loading">Loading…</p>}
                  error={
                    <div>
                      <div className="page-header"><h2 className="page-title">Resale</h2></div>
                      <p className="error-text" role="alert">
                        Couldn’t load Resale. Check your connection, then reload the app.
                      </p>
                      <button className="btn btn--primary" onClick={() => window.location.reload()}>
                        Reload
                      </button>
                    </div>
                  }
                >
                  <ResalePage />
                </LazyChunk>
              }
            />
            <Route
              path="/analytics"
              element={
                <LazyChunk
                  loading={<p className="item-list-loading">Loading…</p>}
                  error={
                    <div>
                      <div className="page-header"><h2 className="page-title">Analytics</h2></div>
                      <p className="error-text" role="alert">
                        Couldn’t load Analytics. Check your connection, then reload the app.
                      </p>
                      <button className="btn btn--primary" onClick={() => window.location.reload()}>
                        Reload
                      </button>
                    </div>
                  }
                >
                  <AnalyticsPage />
                </LazyChunk>
              }
            />
            <Route path="/calendar" element={<CalendarPage />} />
            {/* An unknown path in an installed PWA has no address bar to correct
                it, so send it to the dashboard rather than a blank outlet. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
