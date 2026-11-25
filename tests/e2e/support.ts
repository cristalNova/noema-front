import type { Page } from '@playwright/test'

/**
 * Peticiones que la interfaz hace por su cuenta (la campana del NavBar, las reseñas, el selector de reacciones y
 * el post padre de respuestas, reposts y citas). Sin mock llegan al backend real con un token falso, que responde
 * 401 y cierra la sesión a mitad del test. Se registra antes que las rutas de cada test, así que las de cada test
 * tienen prioridad.
 */
export async function mockBackgroundApis(page: Page) {
  await page.route(
    (url) => url.pathname === '/notifications/unread-count' || url.pathname === '/favorites' || url.pathname === '/bookmarks' || url.pathname === '/progress' || /^\/progress\/\d+$/.test(url.pathname) || url.pathname.startsWith('/reactions/') || url.pathname.startsWith('/reviews/article/') || /^\/posts\/\d+(\/replies)?$/.test(url.pathname),
    (route) => {
      const request = route.request()
      if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
      const { pathname } = new URL(request.url())
      if (pathname === '/notifications/unread-count') return route.fulfill({ json: { unread: 0 } })
      if (pathname === '/favorites') return route.fulfill({ json: { data: [], total: 0, page: 1, limit: Number(new URL(request.url()).searchParams.get('limit') ?? 10) } })
      if (pathname === '/bookmarks') return route.fulfill({ json: { data: [], total: 0, page: 1, limit: Number(new URL(request.url()).searchParams.get('limit') ?? 10) } })
      if (pathname === '/progress') return route.fulfill({ json: { data: [], total: 0, page: 1, limit: Number(new URL(request.url()).searchParams.get('limit') ?? 100) } })
      if (pathname.startsWith('/progress/')) return route.fulfill({ status: 404, json: { message: 'Sin progreso' } })
      if (pathname.startsWith('/reviews/')) return route.fulfill({ json: [] })
      if (pathname.endsWith('/replies')) return route.fulfill({ json: { data: [], total: 0, page: 1, limit: 3 } })
      if (pathname.startsWith('/posts/')) return route.fulfill({ status: 404, json: { statusCode: 404, message: 'Publicación no encontrada' } })
      if (request.method() === 'GET') return route.fulfill({ json: { total: 0, byType: { LIKE: 0, LOVE: 0, INSIGHTFUL: 0 }, mine: null } })
      return route.fulfill({ status: 204 })
    },
  )
}

/**
 * Llega a una sección propia como lo hace una persona: menú de la cuenta → "Mi perfil" → acceso de "Mi espacio".
 * Simula solo lo que el perfil pide (el perfil, sus ensayos y sus listas); las demás rutas de cada test se respetan.
 */
export async function openAccountShortcut(page: Page, me: { id: number }, name: string) {
  await page.route(
    (url) => url.pathname === `/profiles/${me.id}` || url.pathname === `/reading-lists/profile/${me.id}` || (url.pathname === '/articles' && url.searchParams.get('authorId') === String(me.id)),
    (route) => {
      const request = route.request()
      if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
      const { pathname } = new URL(request.url())
      if (pathname === '/articles') return route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } })
      if (pathname.startsWith('/reading-lists/')) return route.fulfill({ json: [] })
      return route.fulfill({ json: { id: me.id, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0 } })
    },
  )
  await page.getByRole('button', { name: /^Cuenta de/ }).click()
  await page.getByRole('menuitem', { name: 'Mi perfil' }).click()
  await page.getByRole('link', { name }).click()
}
