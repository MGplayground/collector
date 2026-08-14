import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { to: '/collection', label: 'Collection' },
  { to: '/analytics',  label: 'Analytics' },
  { to: '/calendar',   label: 'Calendar' },
]

export function Nav() {
  const { signOut } = useAuth()
  return (
    <nav className="nav">
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
        >
          {label}
        </NavLink>
      ))}
      <button className="nav__signout btn btn--ghost" onClick={signOut}>
        Sign out
      </button>
    </nav>
  )
}
