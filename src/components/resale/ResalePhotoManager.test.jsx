import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResalePhotoManager } from './ResalePhotoManager'
import { addResalePhoto, removeResalePhoto, reorderResalePhotos } from '../../services/resale'

vi.mock('../../services/resale', () => ({
  addResalePhoto: vi.fn(),
  removeResalePhoto: vi.fn(),
  reorderResalePhotos: vi.fn(),
  photoUrl: path => `https://cdn.test/${path}`,
}))

const photos = n => Array.from({ length: n }, (_, i) => ({
  id: `p${i + 1}`, item_id: 'item-1', storage_path: `item-1/${i + 1}.jpg`, position: i,
}))

function setup(count, props = {}) {
  const onChange = vi.fn().mockResolvedValue(undefined)
  return {
    user: userEvent.setup(),
    onChange,
    ...render(
      <ResalePhotoManager itemId="item-1" photos={photos(count)} onChange={onChange} {...props} />
    ),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  reorderResalePhotos.mockResolvedValue(undefined)
})

describe('photo overflow warning', () => {
  it('says nothing at or under Depop\'s four', () => {
    setup(4)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('4 / 4')).toBeInTheDocument()
  })

  it('warns about the ones that will not transfer', () => {
    setup(6)
    const warning = screen.getByRole('status')
    expect(warning).toHaveTextContent('Depop takes 4 photos')
    expect(warning).toHaveTextContent('The last 2 photos will not transfer')
  })

  it('counts a single extra photo in the singular', () => {
    setup(5)
    expect(screen.getByRole('status')).toHaveTextContent('The last 1 photo will not transfer')
  })

  it('marks the photos past the cap', () => {
    const { container } = setup(5)
    expect(container.querySelectorAll('.resale-photo--extra')).toHaveLength(1)
  })

  it('clears once a photo is removed', async () => {
    removeResalePhoto.mockResolvedValue(undefined)
    const { user } = setup(5)

    await user.click(screen.getByRole('button', { name: /remove photo 5/i }))

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(removeResalePhoto).toHaveBeenCalledWith('p5')
  })
})

describe('photo order', () => {
  it('labels the first photo as the cover', () => {
    setup(3)
    expect(screen.getByText('Cover')).toBeInTheDocument()
  })

  // Reordering is buttons, not drag and drop: HTML5 drag events never fire
  // from a touchscreen, and this is used one-handed on a phone.
  it('moves a photo later and persists the new order', async () => {
    const { user, onChange } = setup(3)

    await user.click(screen.getByRole('button', { name: /move photo 1 later/i }))

    await waitFor(() => expect(reorderResalePhotos).toHaveBeenCalled())
    expect(reorderResalePhotos.mock.calls[0][0].map(p => p.id)).toEqual(['p2', 'p1', 'p3'])
    expect(onChange).toHaveBeenCalled()
  })

  it('promotes a photo to cover by moving it earlier', async () => {
    const { user } = setup(3)

    await user.click(screen.getByRole('button', { name: /move photo 2 earlier/i }))

    await waitFor(() => expect(reorderResalePhotos).toHaveBeenCalled())
    expect(reorderResalePhotos.mock.calls[0][0].map(p => p.id)).toEqual(['p2', 'p1', 'p3'])
  })

  it('cannot move the ends off either edge', () => {
    setup(3)
    expect(screen.getByRole('button', { name: /move photo 1 earlier/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /move photo 3 later/i })).toBeDisabled()
  })

  it('rolls the order back and says so when the save fails', async () => {
    reorderResalePhotos.mockRejectedValue(new Error('network down'))
    const { user } = setup(3)

    await user.click(screen.getByRole('button', { name: /move photo 1 later/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('network down')
    // Rolled back: photo 1 is at the front again, so it cannot move earlier.
    expect(screen.getByRole('button', { name: /move photo 1 earlier/i })).toBeDisabled()
  })
})

describe('photo upload', () => {
  const file = name => new File(['x'], name, { type: 'image/jpeg' })

  it('appends each file after the photos already there', async () => {
    addResalePhoto.mockResolvedValue({})
    const { user, onChange } = setup(2)

    await user.upload(
      document.querySelector('.resale-photos__input'),
      [file('a.jpg'), file('b.jpg')],
    )

    await waitFor(() => expect(addResalePhoto).toHaveBeenCalledTimes(2))
    expect(addResalePhoto.mock.calls[0][2]).toBe(2)
    expect(addResalePhoto.mock.calls[1][2]).toBe(3)
    expect(onChange).toHaveBeenCalled()
  })

  it('reports the file that failed and still uploads the rest', async () => {
    addResalePhoto
      .mockRejectedValueOnce(new Error('exceeds the size limit'))
      .mockResolvedValueOnce({})
    const { user } = setup(0)

    await user.upload(
      document.querySelector('.resale-photos__input'),
      [file('huge.jpg'), file('fine.jpg')],
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('huge.jpg: exceeds the size limit')
    expect(addResalePhoto).toHaveBeenCalledTimes(2)
    // The survivor takes position 0, not 1 — the failure left no gap.
    expect(addResalePhoto.mock.calls[1][2]).toBe(0)
  })

  it('has no capture attribute, which breaks the picker in an iOS PWA', () => {
    setup(0)
    const input = document.querySelector('.resale-photos__input')
    expect(input).not.toHaveAttribute('capture')
    expect(input).toHaveAttribute('multiple')
    expect(input).toHaveAttribute('accept', 'image/*')
  })
})
