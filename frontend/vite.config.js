import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../', // Directs Vite to read .env from the monorepo root folder
  server: {
    port: 5173,
    host: '127.0.0.1',
  }
})
