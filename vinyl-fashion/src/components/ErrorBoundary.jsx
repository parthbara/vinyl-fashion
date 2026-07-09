import { Component } from 'react'

// Last line of defence: if any render throws, show a themed recovery
// screen instead of a blank white page. On-brand, reassuring, with a
// one-tap reload.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('[vinyl-fashion] render error:', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="crash">
        <div className="crash-disc" aria-hidden="true" />
        <h1 className="crash-title">THE NEEDLE SKIPPED</h1>
        <p className="crash-note">
          Something jumped the groove. Give the record another spin.
        </p>
        <button className="crash-btn" onClick={() => window.location.reload()}>
          ↻ DROP IT AGAIN
        </button>
      </div>
    )
  }
}
