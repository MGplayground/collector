import { render, screen } from '@testing-library/react'
import { lazy } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary, LazyChunk } from './ErrorBoundary'

// React logs every caught render error; the boundary's own componentDidCatch does
// too. Both are expected here, so keep the test output readable.
beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('LazyChunk', () => {
  it('shows the loading fallback, then the chunk', async () => {
    const Chunk = lazy(() => Promise.resolve({ default: () => <p>chart</p> }))

    render(
      <LazyChunk loading={<p>Loading…</p>} error={<p>failed</p>}>
        <Chunk />
      </LazyChunk>
    )

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('chart')).toBeInTheDocument()
  })

  it('shows the error fallback when the chunk fails to load', async () => {
    // What a stale service worker looks like: the hashed filename is gone, so the
    // dynamic import rejects. Without the boundary this hangs on "Loading…".
    const Chunk = lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module')))

    render(
      <LazyChunk
        loading={<p>Loading…</p>}
        error={<p role="alert">Couldn’t load the chart.</p>}
      >
        <Chunk />
      </LazyChunk>
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the chart.')
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })
})

describe('ErrorBoundary', () => {
  function Boom() {
    throw new Error('render exploded')
  }

  it('falls back to the full crash screen when given no fallback', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)

    expect(screen.getByText('Something broke')).toBeInTheDocument()
    expect(screen.getByText('render exploded')).toBeInTheDocument()
  })

  it('accepts a function fallback so a subtree can report its own error', () => {
    render(
      <ErrorBoundary fallback={err => <p>scoped: {err.message}</p>}>
        <Boom />
      </ErrorBoundary>
    )

    expect(screen.getByText('scoped: render exploded')).toBeInTheDocument()
    expect(screen.queryByText('Something broke')).not.toBeInTheDocument()
  })
})
