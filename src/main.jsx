import { createRoot } from 'react-dom/client'
import App from './App'
import { AudioProvider } from './lib/player'
import './styles/base.css'
import './styles/shop.css'
import './styles/cinema.css'
import './styles/album.css'

createRoot(document.getElementById('root')).render(
  <AudioProvider>
    <App />
  </AudioProvider>
)
