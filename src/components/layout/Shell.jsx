import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from './Nav'

export function Shell({ children }) {
  const { signOut } = useAuth()

  return (
    <div className="shell">
      <header className="shell__header">
        {/* The brand is the way back to the dashboard, which has no tab of its
            own: five tabs would not fit, and the dashboard is a starting point
            rather than a section you switch between. */}
        <Link to="/" className="shell__brand" aria-label="Dashboard">The Collector</Link>
        <button className="shell__signout btn btn--ghost" onClick={signOut}>
          Sign out
        </button>
      </header>
      <main className="shell__main">{children}</main>
      <Nav />
    </div>
  )
}
