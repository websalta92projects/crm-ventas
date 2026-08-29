import { useCallback, useState } from 'react'
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from '../utils/theme'

// Tema claro/oscuro: estado reactivo + persistencia en LocalStorage (clave 'theme')
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = getStoredTheme()
    applyTheme(t)
    return t
  })

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      setStoredTheme(next)
      return next
    })
  }, [])

  return [theme, toggle]
}
