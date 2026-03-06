import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// Generate version.json on every build so useVersionCheck can detect new deployments
function versionPlugin() {
  return {
    name: 'version-json',
    buildStart() {
      try {
        const sha = execSync('git rev-parse --short HEAD').toString().trim()
        const version = { version: sha, buildTime: new Date().toISOString() }
        fs.writeFileSync(
          path.resolve(__dirname, 'public/version.json'),
          JSON.stringify(version)
        )
      } catch {
        // Not a git repo or git not available — use timestamp
        const version = { version: String(Date.now()), buildTime: new Date().toISOString() }
        fs.writeFileSync(
          path.resolve(__dirname, 'public/version.json'),
          JSON.stringify(version)
        )
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
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
