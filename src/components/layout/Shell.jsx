import { Nav } from './Nav'

export function Shell({ children }) {
  return (
    <div className="shell">
      <header className="shell__header">
        <span className="shell__brand">The Collector</span>
      </header>
      <main className="shell__main">{children}</main>
      <Nav />
    </div>
  )
}
