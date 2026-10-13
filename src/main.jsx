import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AudioProvider } from './lib/player'
import { watchPerf } from './lib/perf'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/base.css'
import './styles/shop.css'
import './styles/cinema.css'
import './styles/album.css'

// Hidden back room: /<VITE_ADMIN_PATH> renders the admin console
// instead of the storefront. Lazy — shoppers never download it.
const ADMIN_PATH = (import.meta.env.VITE_ADMIN_PATH || '33rpm').replace(/^\/+|\/+$/g, '')
const path = window.location.pathname.replace(/^\/+|\/+$/g, '')

const root = createRoot(document.getElementById('root'))

if (path === ADMIN_PATH) {
  const AdminApp = lazy(() => import('./admin/AdminApp'))
  root.render(
    <ErrorBoundary>
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    </ErrorBoundary>
  )
} else {
  watchPerf()
  import('./lib/settings').then((m) => m.loadSiteSettings())
  root.render(
    <ErrorBoundary>
      <AudioProvider>
        <App />
      </AudioProvider>
    </ErrorBoundary>
  )
}
