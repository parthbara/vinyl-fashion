import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // honors PORT so a second dev server (e.g. tooling) can coexist
    // with one already running on 5173
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
})
