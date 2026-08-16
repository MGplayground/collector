import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ItemForm } from './ItemForm'

// The photo field talks to Supabase storage; nothing here exercises upload.
vi.mock('../../services/images', () => ({
  uploadItemImage: vi.fn(),
  isManagedImage: () => false,
}))

function setup(onSave) {
  return {
    user: userEvent.setup(),
    ...render(<ItemForm item={null} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />),
  }
}

describe('ItemForm payload', () => {
  it('writes sealed product as ungraded with null grade fields', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { user } = setup(onSave)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Vendetta Booster Box')
    await user.selectOptions(screen.getByRole('combobox', { name: /^type$/i }), 'booster_box')
    await user.click(screen.getByRole('button', { name: /add item/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({
      item_type: 'booster_box',
      is_raw: true,
      grade: null,
      grade_company: null,
    })
  })

  it('hides grading controls for sealed product', async () => {
    const { user } = setup(vi.fn())
    expect(screen.getByRole('textbox', { name: /grading company/i })).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /^type$/i }), 'booster_pack')
    expect(screen.queryByRole('textbox', { name: /grading company/i })).not.toBeInTheDocument()
  })

  it('keeps grade fields for a graded card', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { user } = setup(onSave)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Umbreon ex')
    const company = screen.getByRole('textbox', { name: /grading company/i })
    await user.clear(company)
    await user.type(company, 'PSA')
    await user.type(screen.getByRole('textbox', { name: /^grade$/i }), '9')
    await user.click(screen.getByRole('button', { name: /add item/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({
      item_type: 'card', is_raw: false, grade_company: 'PSA', grade: '9',
    })
  })
})

describe('ItemForm failure handling', () => {
  // Regression: this used to be try/finally with no catch, so a rejected insert
  // stopped the spinner and said nothing at all.
  it('shows the error and stays open when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('violates check constraint'))
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<ItemForm item={null} onSave={onSave} onDelete={vi.fn()} onClose={onClose} />)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Broken')
    await user.click(screen.getByRole('button', { name: /add item/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('violates check constraint')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /add item/i })).toBeEnabled()
  })
})
