import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Allow all hosts (needed for tunnels like Cloudflare, ngrok, etc.)
    allowedHosts: [
      '.trycloudflare.com',
      '.loca.lt',
      '.ngrok-free.app',
      '.ngrok.io',
      'localhost'
    ],
    // Or use this to allow all hosts:
    // allowedHosts: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
