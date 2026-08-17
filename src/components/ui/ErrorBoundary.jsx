import { Component, Suspense } from 'react'

/**
 * Without this, any render-time throw unmounts the tree to a blank screen. In an
 * installed PWA there is no address bar, so a white screen is indistinguishable
 * from a crashed app and the only way out is force-quitting.
 *
 * `fallback` narrows that: pass a node, or a `(error) => node` function, to replace
 * the full-screen crash UI with something scoped to the subtree — used by
 * `LazyChunk` so a failed code-split fetch degrades one card, not the whole app.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const { fallback } = this.props
    if (fallback) return typeof fallback === 'function' ? fallback(error) : fallback

    return (
      <div className="crash-screen">
        <p className="crash-screen__title">Something broke</p>
        <p className="crash-screen__body">
          The app hit an error it could not recover from. Reloading usually fixes it.
        </p>
        <p className="crash-screen__detail mono">{error.message}</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}

/**
 * Suspense for a `React.lazy` chunk, with the failure case handled.
 *
 * A lazy chunk is a network fetch, so it can fail: a flaky mobile connection, or —
 * because the service worker registers with `autoUpdate` — a client holding a stale
 * index asking for a hashed filename the new deploy no longer serves. Suspense
 * alone would render `loading` forever in that case, which reads as a hang. The
 * rejection is re-thrown at the lazy component's position, so the boundary outside
 * catches it and renders `error` instead.
 */
export function LazyChunk({ loading, error, children }) {
  return (
    <ErrorBoundary fallback={error}>
      <Suspense fallback={loading}>{children}</Suspense>
    </ErrorBoundary>
  )
}
