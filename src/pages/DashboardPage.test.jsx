import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

// The two modules are two independent queries. Mocking them separately is the
// point: it is the only way to exercise "one failed, the other did not".
vi.mock('../services/analytics', () => ({ getAnalyticsData: vi.fn() }))
vi.mock('../services/resale', () => ({ getResaleItems: vi.fn() }))

const { getAnalyticsData } = await import('../services/analytics')
const { getResaleItems } = await import('../services/resale')

/** Owned £3,000 against a £2,000 basis: an unrealized, gross gain of £1,000. */
const COLLECTION = {
  totalValue: 3000,
  totalInvested: 2000,
  totalGain: 1000,
  heldCount: 4,
  watchlistValue: 750,
  watchlistCount: 2,
}

const DAY = 24 * 60 * 60 * 1000
const ago = days => new Date(Date.now() - days * DAY).toISOString()

/**
 * Two live listings, one of them overdue a bump, and one sale that realised
 * £250 net: £400 sold, less £100 cost, £40 fee and £10 shipping.
 */
const RESALE_ITEMS = [
  {
    id: 'i1', state: 'listed', cost: 60,
    resale_listings: [
      { id: 'l1', item_id: 'i1', state: 'listed', listed_at: ago(9), last_bumped_at: ago(9), bump_days: 3 },
    ],
  },
  {
    id: 'i2', state: 'listed', cost: 40,
    resale_listings: [
      { id: 'l2', item_id: 'i2', state: 'listed', listed_at: ago(1), last_bumped_at: ago(1), bump_days: 3 },
    ],
  },
  {
    id: 'i3', state: 'sold', cost: 100,
    resale_listings: [
      { id: 'l3', item_id: 'i3', state: 'sold', sold_price: 400, platform_fee: 40, shipping_cost: 10 },
    ],
  },
]

function renderDashboard() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>)
}

const moduleFor = name =>
  screen.getByRole('region', { name: new RegExp(`^${name}$`, 'i') })

beforeEach(() => {
  vi.mocked(getAnalyticsData).mockReset()
  vi.mocked(getResaleItems).mockReset()
})

describe('DashboardPage', () => {
  it('renders both modules’ figures from two independent queries', async () => {
    getAnalyticsData.mockResolvedValue(COLLECTION)
    getResaleItems.mockResolvedValue(RESALE_ITEMS)

    renderDashboard()

    const collection = await screen.findByRole('region', { name: /^collection$/i })
    expect(within(collection).getByText('£3,000.00')).toBeInTheDocument()   // portfolio value
    expect(within(collection).getByText('£2,000.00')).toBeInTheDocument()   // cost basis
    expect(within(collection).getByText(/\+£1,000\.00/)).toBeInTheDocument() // unrealized gain
    expect(within(collection).getByText('£750.00')).toBeInTheDocument()     // watchlist

    const resale = moduleFor('resale')
    expect(within(resale).getByText('£100.00')).toBeInTheDocument()          // stock at cost, 60 + 40
    expect(within(resale).getByText('+£250.00')).toBeInTheDocument()         // realised profit
    expect(within(resale).getByText('Live listings').parentElement)
      .toHaveTextContent('2')
    expect(within(resale).getByText('Sold').parentElement).toHaveTextContent('1')

    expect(getAnalyticsData).toHaveBeenCalledTimes(1)
    expect(getResaleItems).toHaveBeenCalledTimes(1)
  })

  it('leads with the bump worklist and links it to the resale tab', async () => {
    getAnalyticsData.mockResolvedValue(COLLECTION)
    getResaleItems.mockResolvedValue(RESALE_ITEMS)

    renderDashboard()

    const bump = await screen.findByRole('link', { name: /due to bump/i })
    expect(bump).toHaveAttribute('href', '/resale')
    expect(bump).toHaveTextContent('1')   // only the 9-day-stale listing is due
  })

  it('keeps the collection figures when the resale query fails', async () => {
    getAnalyticsData.mockResolvedValue(COLLECTION)
    getResaleItems.mockRejectedValue(new Error('resale is down'))

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(/resale is down/)
    expect(within(moduleFor('collection')).getByText('£3,000.00')).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it('keeps the resale figures when the collection query fails', async () => {
    getAnalyticsData.mockRejectedValue(new Error('analytics is down'))
    getResaleItems.mockResolvedValue(RESALE_ITEMS)

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(/analytics is down/)
    expect(within(moduleFor('resale')).getByText('+£250.00')).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it('retries only the module that failed', async () => {
    getAnalyticsData.mockResolvedValue(COLLECTION)
    getResaleItems
      .mockRejectedValueOnce(new Error('resale is down'))
      .mockResolvedValue(RESALE_ITEMS)

    const user = userEvent.setup()
    renderDashboard()

    await user.click(await screen.findByRole('button', { name: /try again/i }))

    await waitFor(() =>
      expect(within(moduleFor('resale')).getByText('+£250.00')).toBeInTheDocument())
    expect(getAnalyticsData).toHaveBeenCalledTimes(1)
    expect(getResaleItems).toHaveBeenCalledTimes(2)
  })

  it('never adds unrealized collection gain to realised resale profit', async () => {
    getAnalyticsData.mockResolvedValue(COLLECTION)
    getResaleItems.mockResolvedValue(RESALE_ITEMS)

    renderDashboard()
    await screen.findByRole('region', { name: /^collection$/i })

    // £1,000 unrealized + £250 realised would be £1,250, and £3,000 portfolio
    // value + £100 stock at cost would be £3,100. Neither is a real quantity,
    // so neither may appear anywhere on the page.
    const page = document.body.textContent
    expect(page).not.toMatch(/1,250/)
    expect(page).not.toMatch(/3,100/)
    expect(page).not.toMatch(/net worth|combined|grand total|overall total/i)

    // Every figure stays inside the module it belongs to.
    const collection = moduleFor('collection')
    const resale = moduleFor('resale')
    expect(within(collection).queryByText(/£250\.00/)).toBeNull()
    expect(within(resale).queryByText(/£1,000\.00/)).toBeNull()
  })
})
