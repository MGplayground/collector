import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MarkSoldForm } from './MarkSoldForm'

const item = { id: 'i1', name: 'Detroit jacket', cost: 20 }
const listing = { id: 'l1', state: 'listed', price: 45 }

function setup(props = {}) {
  return {
    user: userEvent.setup(),
    ...render(
      <MarkSoldForm
        listing={listing}
        item={item}
        onMarkSold={vi.fn().mockResolvedValue(undefined)}
        {...props}
      />
    ),
  }
}

describe('MarkSoldForm net profit', () => {
  it('nets the fee, the shipping and what the item cost', async () => {
    const { user } = setup()

    await user.type(screen.getByRole('spinbutton', { name: /depop fee/i }), '4.50')
    await user.type(screen.getByRole('spinbutton', { name: /shipping/i }), '3')

    // 45 − 20 cost − 4.50 fee − 3 shipping
    expect(screen.getByText('+£17.50')).toBeInTheDocument()
    expect(screen.getByText('+87.5%')).toBeInTheDocument()
  })

  it('shows a loss as a loss', async () => {
    const { user } = setup()
    const price = screen.getByRole('spinbutton', { name: /sale price/i })
    await user.clear(price)
    await user.type(price, '15')

    expect(screen.getByText('−£5.00')).toBeInTheDocument()
  })

  it('sends unknown fees as null rather than zero', async () => {
    const onMarkSold = vi.fn().mockResolvedValue(undefined)
    const { user } = setup({ onMarkSold })

    await user.click(screen.getByRole('button', { name: /mark sold/i }))

    await waitFor(() => expect(onMarkSold).toHaveBeenCalled())
    expect(onMarkSold).toHaveBeenCalledWith('l1', {
      sold_price: 45, platform_fee: null, shipping_cost: null,
    })
  })

  it('keeps the form open and says why when the sale will not save', async () => {
    const onMarkSold = vi.fn().mockRejectedValue(
      new Error('That listing is not live, so it cannot be marked sold.')
    )
    const onDone = vi.fn()
    const { user } = setup({ onMarkSold, onDone })

    await user.click(screen.getByRole('button', { name: /mark sold/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('not live')
    expect(onDone).not.toHaveBeenCalled()
  })
})
