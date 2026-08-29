export type Theme = 'dark' | 'light'

export const THEME_KEY = 'theme'

// Lee la preferencia guardada (por defecto oscuro)
export function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

// Aplica el tema al elemento <html data-theme="..."> y al color de la barra del navegador
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#020617' : '#eef2f7')
  }
}

// Guarda la preferencia y la aplica
export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // almacenamiento no disponible: igual se aplica el tema en la sesión
  }
  applyTheme(theme)
}
