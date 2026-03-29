import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
  plugins: [
    react(),
    versionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      workbox: {
        // Never intercept /auth/* or /api/* — let those go straight to network
        navigateFallbackDenylist: [/^\/auth\//, /^\/api\//],
        // Network-first for auth and api routes
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cricketmela-api\.fly\.dev\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Cricket Mela',
        short_name: 'Cricket Mela',
        description: 'Cricket Matches Betting App',
        theme_color: '#1a1f33',
        background_color: '#1a1f33',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
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
