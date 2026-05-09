import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="material-symbols-outlined text-6xl" style={{ color: '#00BFFF', fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <h2 className="font-headline text-2xl font-bold text-white">משהו השתבש</h2>
          <p className="text-white/50 text-sm max-w-xs">
            {this.state.error?.message || 'שגיאה לא צפויה'}
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-3 rounded-xl font-headline font-bold uppercase active:scale-95 duration-200 text-black"
            style={{ backgroundColor: '#00BFFF', boxShadow: '0 4px 20px rgba(0,191,255,0.4)' }}
          >
            חזור לדשבורד
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
