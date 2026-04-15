import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="material-symbols-outlined text-6xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <h2 className="font-headline text-2xl font-bold">משהו השתבש</h2>
          <p className="text-on-surface-variant text-sm max-w-xs">
            {this.state.error?.message || 'שגיאה לא צפויה'}
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-primary-container text-on-primary-fixed px-6 py-3 rounded-lg font-headline font-bold uppercase active:scale-95 duration-200"
          >
            חזור לדשבורד
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
