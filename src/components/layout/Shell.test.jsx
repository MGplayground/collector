import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Shell } from './Shell'

const signOut = vi.fn()
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ signOut }) }))

const renderShell = () =>
  render(<MemoryRouter><Shell><p>page</p></Shell></MemoryRouter>)

describe('Shell', () => {
  it('shows exactly the four sections in the tab bar', () => {
    renderShell()
    const nav = screen.getByRole('navigation', { name: /sections/i })
    expect(within(nav).getAllByRole('link').map(a => a.textContent))
      .toEqual(['Collection', 'Resale', 'Analytics', 'Calendar'])
  })

  it('keeps sign out out of the tab bar so four labels fit at 56px', () => {
    renderShell()
    const nav = screen.getByRole('navigation', { name: /sections/i })
    expect(within(nav).queryByRole('button', { name: /sign out/i })).toBeNull()

    const signOutButton = within(screen.getByRole('banner'))
      .getByRole('button', { name: /sign out/i })
    expect(signOutButton).toBeInTheDocument()
  })

  it('signs out from the header button', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(signOut).toHaveBeenCalled()
  })

  it('routes the brand back to the dashboard, which has no tab of its own', () => {
    renderShell()
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/')
  })
})
