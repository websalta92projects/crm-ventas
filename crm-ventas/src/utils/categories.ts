const STORAGE_KEY = 'categories'

/** Lee las categorías guardadas en LocalStorage (clave: categories). */
export function getStoredCategories(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
  } catch {
    return []
  }
}

/** Sobrescribe la lista de categorías en LocalStorage. */
export function setStoredCategories(categories: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
  } catch {
    // Almacenamiento no disponible (modo privado, etc.): no bloquear el formulario
  }
}

/**
 * Une las categorías de LocalStorage con las que ya usan los productos
 * (para no perder categorías históricas), sin duplicados y ordenadas.
 */
export function mergeCategories(fromProducts: string[]): string[] {
  const merged = new Set<string>()
  for (const c of [...getStoredCategories(), ...fromProducts]) {
    const t = c.trim()
    if (t) merged.add(t)
  }
  return Array.from(merged).sort((a, b) => a.localeCompare(b, 'es'))
}

/** Registra una categoría en LocalStorage si no existe y devuelve la lista actualizada. */
export function registerCategory(name: string): string[] {
  const t = name.trim()
  const current = new Set(getStoredCategories())
  if (t) current.add(t)
  const next = Array.from(current).sort((a, b) => a.localeCompare(b, 'es'))
  setStoredCategories(next)
  return next
}
