import { Component } from 'react'

/**
 * Without this, any render-time throw unmounts the tree to a blank screen. In an
 * installed PWA there is no address bar, so a white screen is indistinguishable
 * from a crashed app and the only way out is force-quitting.
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
    if (!this.state.error) return this.props.children

    return (
      <div className="crash-screen">
        <p className="crash-screen__title">Something broke</p>
        <p className="crash-screen__body">
          The app hit an error it could not recover from. Reloading usually fixes it.
        </p>
        <p className="crash-screen__detail mono">{this.state.error.message}</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
