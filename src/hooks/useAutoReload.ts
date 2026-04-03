import { useEffect } from 'react'

const CHECK_INTERVAL = 60_000 // check every 60s

/** Auto-reload when a new deploy is detected */
export function useAutoReload() {
  useEffect(() => {
    let currentScripts: string | null = null

    const check = async () => {
      try {
        const resp = await fetch(window.location.pathname, { cache: 'no-store' })
        const html = await resp.text()
        const scripts = html.match(/src="[^"]*\.js"/g)?.join('') ?? ''

        if (currentScripts === null) {
          currentScripts = scripts
        } else if (scripts !== currentScripts) {
          window.location.reload()
        }
      } catch {
        // ignore fetch errors
      }
    }

    check()
    const id = setInterval(check, CHECK_INTERVAL)
    return () => clearInterval(id)
  }, [])
}
