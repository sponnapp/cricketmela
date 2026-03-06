/**
 * useVersionCheck – polls /version.json every 30 seconds.
 * When the build hash changes it shows a banner so users know to refresh.
 * Also triggers a refresh callback every 30 seconds for data updates.
 *
 * version.json is generated at build time by the deploy script with:
 *   { "version": "<git-sha-or-timestamp>" }
 */
import { useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 30 * 1000   // 30 seconds

export default function useVersionCheck(onRefresh) {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  useEffect(() => {
    // Fetch initial version so we know what we started with
    let currentVersion = null

    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!data.version) return

        if (currentVersion === null) {
          currentVersion = data.version            // first load – just store
        } else if (data.version !== currentVersion) {
          setUpdateAvailable(true)                 // new build detected
        }
      } catch {
        // Silently ignore network errors (offline, dev server, etc.)
      }

      // Trigger data refresh callback
      if (onRefresh && typeof onRefresh === 'function') {
        onRefresh()
      }
      setLastRefresh(Date.now())
    }

    checkVersion()
    const id = setInterval(checkVersion, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [onRefresh])

  return { updateAvailable, lastRefresh }
}

