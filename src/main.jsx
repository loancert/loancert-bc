import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import BuyerCompanion from './BuyerCompanion'

// Catches any render-time throw so a single bad state never blanks the whole page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error('[BuyerCompanion] render error:', error)
  }
  render() {
    if (this.state.failed) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: '#fff', background: '#0D1B2E', fontFamily: 'system-ui, sans-serif' }}>
          Something went wrong loading the Buyer Companion. Please refresh to try again.
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BuyerCompanion />
    </ErrorBoundary>
  </React.StrictMode>
)
