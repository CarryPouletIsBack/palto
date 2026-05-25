import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

function readAppToasterTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-app-theme') === 'dark' ? 'dark' : 'light'
}

/** Toasts Sonner alignés sur `html[data-app-theme]`. */
export function AppToaster() {
  const [theme, setTheme] = useState<'light' | 'dark'>(readAppToasterTheme)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setTheme(readAppToasterTheme())
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-app-theme'] })
    window.addEventListener('storage', sync)
    return () => {
      observer.disconnect()
      window.removeEventListener('storage', sync)
    }
  }, [])

  return <Toaster position="bottom-right" theme={theme} />
}
