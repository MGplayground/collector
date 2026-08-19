import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListingComposer } from './ListingComposer'

// Templates are passed in by these tests; the mock only stops the service
// module pulling in a Supabase client that has no configuration here.
vi.mock('../../services/resale', () => ({ getTemplates: vi.fn().mockResolvedValue([]) }))

const item = { id: 'i1', name: 'Detroit jacket', attributes: { brand: 'Carhartt' } }

const template = {
  id: 't1',
  name: 'Clothing',
  title_template: '{{brand}} {{name}} — {{size}}',
  description_template: '{{condition_note}}',
  hashtags: ['carhartt'],
}

function setup(props = {}) {
  return {
    user: userEvent.setup(),
    ...render(
      <ListingComposer
        item={item}
        listing={null}
        templates={[template]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        {...props}
      />
    ),
  }
}

describe('ListingComposer character counter', () => {
  // The 1000 characters are the combined title + description + hashtags that
  // Depop actually receives, not the description on its own.
  const longListing = { title: 'A', description: 'x'.repeat(995), hashtags: [] }

  it('counts against the combined Depop text and reports going over', async () => {
    const { user } = setup({ listing: longListing })

    // 1 title + 2 newlines + 995 description = 998.
    expect(screen.getByRole('status')).toHaveTextContent('2 of 1000 left')

    await user.type(screen.getByRole('textbox', { name: /description/i }), 'xxxxx')

    expect(screen.getByRole('status')).toHaveTextContent('3 over the 1000 limit')
  })

  it('refuses to save copy that is over the limit', async () => {
    const onSave = vi.fn()
    const { user } = setup({ listing: longListing, onSave })

    await user.type(screen.getByRole('textbox', { name: /description/i }), 'xxxxx')

    expect(screen.getByRole('alert')).toHaveTextContent(/Too long for Depop: 1003 characters/)
    expect(screen.getByRole('button', { name: /save to listing/i })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('ListingComposer placeholder validation', () => {
  // render() strips a placeholder it cannot fill, so the copy is publishable.
  // Naming the gap is useful; blocking the save over a missing measurement is not.
  it('names every placeholder the item could not fill, without blocking the save', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: /template/i }), 't1')

    const note = screen.getByRole('status', { name: /missing details/i })
    expect(note).toHaveTextContent(/no value for/i)
    expect(note).toHaveTextContent('size')
    expect(note).toHaveTextContent('condition_note')
    expect(screen.getByRole('button', { name: /save to listing/i })).toBeEnabled()
  })

  it('never leaves a raw placeholder in the text that gets pasted', async () => {
    const { user } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: /template/i }), 't1')

    expect(screen.getByRole('textbox', { name: /^title$/i })).toHaveValue('Carhartt Detroit jacket')
  })

  it('clears a gap once that field has been filled in by hand', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { user } = setup({ onSave })
    await user.selectOptions(screen.getByRole('combobox', { name: /template/i }), 't1')

    await user.type(screen.getByRole('textbox', { name: /^title$/i }), ' — L')
    expect(screen.getByRole('status', { name: /missing details/i })).not.toHaveTextContent('size')
    expect(screen.getByRole('status', { name: /missing details/i })).toHaveTextContent('condition_note')

    await user.type(screen.getByRole('textbox', { name: /description/i }), 'Barely worn.')
    expect(screen.queryByRole('status', { name: /missing details/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save to listing/i }))
    expect(onSave).toHaveBeenCalledWith({
      title: 'Carhartt Detroit jacket — L',
      description: 'Barely worn.',
      hashtags: ['carhartt'],
    })
  })

  it('catches a placeholder typed straight into the description', async () => {
    const { user } = setup({ listing: { title: 'Jacket', description: 'Nice', hashtags: [] } })

    await user.type(screen.getByRole('textbox', { name: /description/i }), ' {{{{brand}}')

    expect(screen.getByRole('alert')).toHaveTextContent('brand')
    expect(screen.getByRole('button', { name: /save to listing/i })).toBeDisabled()
  })
})
