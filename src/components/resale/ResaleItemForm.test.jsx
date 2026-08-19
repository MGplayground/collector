import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResaleItemForm } from './ResaleItemForm'

// The photo manager talks to Supabase storage; intake payloads never touch it.
vi.mock('../../services/resale', () => ({
  addResalePhoto: vi.fn(),
  removeResalePhoto: vi.fn(),
  reorderResalePhotos: vi.fn(),
  photoUrl: () => 'blob:photo',
}))

function setup(onSave = vi.fn(), item = null) {
  return {
    user: userEvent.setup(),
    onSave,
    ...render(
      <ResaleItemForm item={item} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />
    ),
  }
}

const category = () => screen.getByRole('combobox', { name: /category/i })

describe('ResaleItemForm category attributes', () => {
  it('shows the clothing field set by default', () => {
    setup()
    expect(screen.getByRole('textbox', { name: /brand/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^size$/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /colour/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /material/i })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: /pit to pit/i })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: /^length/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /^set$/i })).not.toBeInTheDocument()
  })

  it('swaps the whole field set when the category changes', async () => {
    const { user } = setup()

    await user.selectOptions(category(), 'cards')
    expect(screen.getByRole('textbox', { name: /^set$/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /card number/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /condition detail/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /brand/i })).not.toBeInTheDocument()

    await user.selectOptions(category(), 'sealed')
    expect(screen.getByRole('textbox', { name: /^set$/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /language/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /card number/i })).not.toBeInTheDocument()

    // 'other' has no attributes at all, which must not be a crash.
    await user.selectOptions(category(), 'other')
    expect(screen.queryByRole('textbox', { name: /^set$/i })).not.toBeInTheDocument()
  })

  it('writes attributes under the keys templates interpolate', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { user } = setup(onSave)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Detroit jacket')
    await user.type(screen.getByRole('textbox', { name: /brand/i }), '  Carhartt  ')
    await user.type(screen.getByRole('textbox', { name: /^size$/i }), 'M')
    await user.type(screen.getByRole('spinbutton', { name: /pit to pit/i }), '58.5')
    await user.type(screen.getByRole('spinbutton', { name: /cost/i }), '20')
    await user.click(screen.getByRole('button', { name: /add item/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const payload = onSave.mock.calls[0][0]
    expect(payload.category).toBe('clothing')
    expect(payload.cost).toBe(20)
    // Trimmed strings, real numbers for measurements, blanks dropped entirely.
    expect(payload.attributes).toEqual({ brand: 'Carhartt', size: 'M', pit_to_pit: 58.5 })
  })

  it('never writes another category\'s attributes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { user } = setup(onSave)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Umbreon ex')
    await user.type(screen.getByRole('textbox', { name: /brand/i }), 'Carhartt')
    await user.selectOptions(category(), 'cards')
    await user.type(screen.getByRole('textbox', { name: /^set$/i }), 'Evolving Skies')
    await user.click(screen.getByRole('button', { name: /add item/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0].attributes).toEqual({ set: 'Evolving Skies' })
  })

  it('keeps typing when the category is switched away and back', async () => {
    const { user } = setup()

    await user.type(screen.getByRole('textbox', { name: /brand/i }), 'Stussy')
    await user.selectOptions(category(), 'cards')
    await user.selectOptions(category(), 'clothing')

    expect(screen.getByRole('textbox', { name: /brand/i })).toHaveValue('Stussy')
  })

  it('loads existing attributes into their fields', () => {
    setup(vi.fn(), {
      id: 'i1', name: 'Jacket', category: 'clothing', condition: 'good',
      attributes: { brand: 'Carhartt', pit_to_pit: 58 }, resale_photos: [],
    })
    expect(screen.getByRole('textbox', { name: /brand/i })).toHaveValue('Carhartt')
    expect(screen.getByRole('spinbutton', { name: /pit to pit/i })).toHaveValue(58)
  })

  it('carries through attribute keys the field map does not own', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    // `fit` came from somewhere else — a hand-written template may reference it,
    // and intake is not the thing that decides it is junk.
    const { user } = setup(onSave, {
      id: 'i1', name: 'Jacket', category: 'clothing', condition: 'good',
      attributes: { brand: 'Carhartt', fit: 'oversized' }, resale_photos: [],
    })

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0].attributes).toEqual({ brand: 'Carhartt', fit: 'oversized' })
  })
})

describe('ResaleItemForm failure handling', () => {
  // Same regression as ItemForm: a rejected save used to stop the spinner and
  // say nothing, which looks exactly like a save that worked.
  it('shows the error and stays open when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('violates check constraint'))
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<ResaleItemForm item={null} onSave={onSave} onDelete={vi.fn()} onClose={onClose} />)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Broken')
    await user.click(screen.getByRole('button', { name: /add item/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('violates check constraint')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /add item/i })).toBeEnabled()
  })
})
