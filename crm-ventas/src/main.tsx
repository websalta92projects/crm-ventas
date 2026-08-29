import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import { applyTheme, getStoredTheme } from './utils/theme'

// Aplica el tema guardado ANTES del primer render (evita parpadeo)
applyTheme(getStoredTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--toast-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--toast-border)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          fontSize: '14px',
        },
      }}
    />
  </React.StrictMode>,
)
