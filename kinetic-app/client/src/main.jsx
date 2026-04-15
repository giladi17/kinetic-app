import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

const root = document.getElementById('root')

try {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
} catch (err) {
  console.error('React render failed:', err)
  root.innerHTML = `
    <div style="color:white;padding:20px;font-family:Arial">
      <h2>שגיאה בטעינה</h2>
      <pre style="color:red">${err.message}</pre>
    </div>
  `
}
