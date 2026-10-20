import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './estilo-grade.css'
import { aplicarAparencia, lerAparencia } from './dados/aparencia'

// Antes do primeiro desenho, para a página não abrir no estilo errado.
aplicarAparencia(lerAparencia())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
