import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'
import { Buffer } from 'buffer';
window.Buffer = Buffer;
axios.defaults.baseURL = import.meta.env.VITE_API_URL   // e.g. http://localhost:8000

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
