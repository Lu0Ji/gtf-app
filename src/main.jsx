import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'iconify-icon'
import './index.css'
import './i18n/index.js'
import { applyIosViewport } from './lib/iosViewport.js'
import App from './App.jsx'

applyIosViewport()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
