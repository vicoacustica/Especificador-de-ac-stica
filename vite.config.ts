import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Caminho relativo para funcionar no GitHub Pages com qualquer nome de repositório.
  base: './',
  plugins: [react()],
})
