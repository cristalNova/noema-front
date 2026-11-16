import type { Page } from '@playwright/test'

/**
 * Peticiones que la interfaz hace por su cuenta (la campana del NavBar, las reseñas, el selector de reacciones y
 * el post padre de respuestas, reposts y citas). Sin mock llegan al backend real con un token falso, que responde
 * 401 y cierra la sesión a mitad del test. Se registra antes que las rutas de cada test, así que las de cada test
 * tienen prioridad.
 */
export async function mockBackgroundApis(page: Page) {
  await page.route(
    (url) => url.pathname === '/notifications/unread-count' || url.pathname.startsWith('/reactions/') || url.pathname.startsWith('/reviews/article/') || /^\/posts\/\d+(\/replies)?$/.test(url.pathname),
    (route) => {
      const request = route.request()
      if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
      const { pathname } = new URL(request.url())
      if (pathname === '/notifications/unread-count') return route.fulfill({ json: { unread: 0 } })
      if (pathname.startsWith('/reviews/')) return route.fulfill({ json: [] })
      if (pathname.endsWith('/replies')) return route.fulfill({ json: { data: [], total: 0, page: 1, limit: 3 } })
      if (pathname.startsWith('/posts/')) return route.fulfill({ status: 404, json: { statusCode: 404, message: 'Publicación no encontrada' } })
      if (request.method() === 'GET') return route.fulfill({ json: { total: 0, byType: { LIKE: 0, LOVE: 0, INSIGHTFUL: 0 }, mine: null } })
      return route.fulfill({ status: 204 })
    },
  )
}
