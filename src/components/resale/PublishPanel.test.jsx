import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PublishPanel } from './PublishPanel'

vi.mock('../../services/resale', () => ({
  photoUrl: path => `https://cdn.test/${path}`,
}))

const item = { id: 'i1', name: 'Detroit jacket' }
const photos = [
  { id: 'p1', storage_path: 'a.jpg', position: 0 },
  { id: 'p2', storage_path: 'b.jpg', position: 1 },
]
const listing = {
  id: 'l1', state: 'draft', title: 'Carhartt Detroit jacket',
  description: 'Barely worn.', hashtags: ['carhartt'], price: 45,
}

function setup(props = {}) {
  return {
    user: userEvent.setup(),
    ...render(
      <PublishPanel
        item={item}
        listing={listing}
        photos={photos}
        onPublish={vi.fn().mockResolvedValue(undefined)}
        {...props}
      />
    ),
  }
}

describe('PublishPanel hand-off', () => {
  it('offers the exact combined text Depop will receive', () => {
    const { container } = setup()
    // Exactly toDepopText(), newlines and all — not a re-flowed approximation.
    expect(container.querySelector('.publish__text').textContent)
      .toBe('Carhartt Detroit jacket\n\nBarely worn.\n\n#carhartt')
  })

  it('names what is missing instead of only disabling the button', () => {
    setup({ listing: { id: 'l1', state: 'draft' }, photos: [] })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('at least one photo')
    expect(alert).toHaveTextContent('a title')
    expect(alert).toHaveTextContent('a description')
    expect(alert).toHaveTextContent('a price')
    expect(screen.getByRole('button', { name: /mark as listed/i })).toBeDisabled()
  })

  it('records the pasted Depop URL when confirming', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const onDone = vi.fn()
    const { user } = setup({ onPublish, onDone })

    await user.type(
      screen.getByRole('textbox', { name: /depop listing url/i }),
      'https://www.depop.com/products/abc'
    )
    await user.click(screen.getByRole('button', { name: /mark as listed/i }))

    await waitFor(() => expect(onPublish).toHaveBeenCalledWith('l1', {
      external_url: 'https://www.depop.com/products/abc',
    }))
    expect(onDone).toHaveBeenCalled()
  })
})

describe('PublishPanel clipboard', () => {
  it('confirms the copy when the clipboard works', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /copy text/i }))
    expect(await screen.findByRole('button', { name: /copied/i })).toBeInTheDocument()
  })

  // Insecure origins and denied permissions both reject. A silent no-op would
  // leave the user thinking they had the text on the clipboard when they did not.
  it('falls back to a selectable box when the clipboard is denied', async () => {
    const { user } = setup()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })

    await user.click(screen.getByRole('button', { name: /copy text/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/would not let us use the clipboard/i)
    const box = screen.getByRole('textbox', { name: /listing text to copy by hand/i })
    expect(box).toHaveValue('Carhartt Detroit jacket\n\nBarely worn.\n\n#carhartt')
    expect(box).toHaveFocus()
  })
})
