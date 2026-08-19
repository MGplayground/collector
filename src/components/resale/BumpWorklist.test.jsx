import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BumpWorklist } from './BumpWorklist'

const NOW = new Date('2026-08-19T12:00:00Z')
const daysAgo = n => new Date(NOW.getTime() - n * 86400000).toISOString()

const listing = (id, name, over = {}) => ({
  id, state: 'listed', bump_days: 3, price: 45,
  listed_at: daysAgo(10), last_bumped_at: null,
  item: { id: `i-${id}`, name },
  ...over,
})

// Deliberately not in due order: the component must sort, not the caller.
const listings = [
  listing('b', 'One day late', { listed_at: daysAgo(4) }),
  listing('c', 'Fifteen days late', { listed_at: daysAgo(30), last_bumped_at: daysAgo(20), bump_days: 5 }),
  listing('a', 'Seven days late'),
  listing('d', 'Not due yet', { listed_at: daysAgo(0) }),
  listing('e', 'Already sold', { state: 'sold' }),
]

function setup(props = {}) {
  return {
    user: userEvent.setup(),
    ...render(
      <BumpWorklist
        listings={listings}
        now={NOW}
        onBump={vi.fn().mockResolvedValue(undefined)}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
        {...props}
      />
    ),
  }
}

describe('BumpWorklist ordering', () => {
  it('shows only what is due, most overdue first', () => {
    setup()
    const names = screen.getAllByRole('listitem').map(li => li.querySelector('.bump-row__name').textContent)
    expect(names).toEqual(['Fifteen days late', 'Seven days late', 'One day late'])
  })

  it('says how late each one is', () => {
    setup()
    expect(screen.getByText('15 days overdue')).toBeInTheDocument()
    expect(screen.getByText('1 day overdue')).toBeInTheDocument()
  })

  it('says nothing is due rather than showing an empty list', () => {
    setup({ listings: [listing('d', 'Not due yet', { listed_at: daysAgo(0) })] })
    expect(screen.getByText(/nothing due/i)).toBeInTheDocument()
  })
})

describe('BumpWorklist sold-during-bump race', () => {
  // The service refuses to bump a listing that is no longer live. Swallowing
  // that would leave a sold item sitting in the worklist looking bumped.
  it('shows the failure and refetches instead of swallowing it', async () => {
    const onBump = vi.fn().mockRejectedValue(
      new Error('That listing is no longer live — it may have sold.')
    )
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const { user } = setup({ onBump, onRefresh })

    await user.click(screen.getAllByRole('button', { name: /bumped/i })[0])

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('That listing is no longer live — it may have sold.')
    await waitFor(() => expect(onRefresh).toHaveBeenCalled())
    expect(onBump).toHaveBeenCalledWith('c')
  })

  it('records a successful bump against the row that was tapped', async () => {
    const onBump = vi.fn().mockResolvedValue(undefined)
    const { user } = setup({ onBump })

    await user.click(screen.getAllByRole('button', { name: /bumped/i })[1])

    await waitFor(() => expect(onBump).toHaveBeenCalledWith('a'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
