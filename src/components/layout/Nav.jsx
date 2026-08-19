import { NavLink } from 'react-router-dom'

/**
 * Four tabs in 56px, on a phone, one-handed.
 *
 * "Sign out" used to sit here as a fifth control. With a fourth tab added it
 * would have squeezed every label to the point of truncation, and it does not
 * belong beside navigation anyway: it is a once-a-year action sharing a row
 * with the four things you tap all day. It now lives in the header, so the tab
 * bar is exactly the four destinations and each gets a full quarter of the
 * width — comfortably wider than the 44px minimum, at the full 56px height.
 */
const links = [
  { to: '/collection', label: 'Collection' },
  { to: '/resale',     label: 'Resale' },
  { to: '/analytics',  label: 'Analytics' },
  { to: '/calendar',   label: 'Calendar' },
]

export function Nav() {
  return (
    <nav className="nav" aria-label="Sections">
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
