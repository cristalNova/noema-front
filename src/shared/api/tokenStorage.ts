const TOKEN_KEY = 'noema.access_token'

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* almacenamiento no disponible: la sesión dura solo en memoria */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* noop */
    }
  },
  /** Avisa cuando otra pestaña inicia o cierra sesión. Devuelve la función para dejar de escuchar. */
  subscribe(onChange: () => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === null) onChange()
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  },
}
