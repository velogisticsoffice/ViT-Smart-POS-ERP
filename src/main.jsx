import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BusinessProvider } from './context/BusinessContext.jsx'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#031b4e] p-8 text-white">
          <h1 className="text-3xl font-bold text-red-300">App render error</h1>
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-red-500 bg-red-950/40 p-4 text-sm text-red-100">
            {this.state.error.message}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <BusinessProvider>
        <App />
      </BusinessProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
