import { expect, test, type Page, type Route } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(({ page }) => mockBackgroundApis(page))

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }
const ana = { id: 7, name: 'Ana Ruiz', username: 'ana', profilePhoto: null }
const beto = { id: 9, name: 'Beto Gil', username: 'beto', profilePhoto: null }

function makePost(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id, ownerId: ana.id, owner: ana, communityId: null, articleId: null, article: null, parentPostId: null, postType: 'ORIGINAL',
    visibility: 'PUBLIC', content: `Publicación número ${id}`, likes: 0, repostCount: 0, commentCount: 0, createdAt: '2026-11-01T12:00:00.000Z', ...overrides,
  }
}

function reply(id: number, parentPostId: number, content: string, overrides: Record<string, unknown> = {}) {
  return makePost(id, { ownerId: beto.id, owner: beto, postType: 'REPLY', parentPostId, content, ...overrides })
}

function tokenFor(userId = '8') {
  const payload = btoa(JSON.stringify({ sub: userId, email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  return `header.${payload}.signature`
}

async function mockApi(page: Page, path: string, handler: (route: Route, url: URL) => Promise<void> | void) {
  await page.route(path, async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    await handler(route, new URL(route.request().url()))
  })
}

async function signIn(page: Page) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await mockApi(page, '**/profiles/me', (route) => route.fulfill({ json: me }))
  await mockApi(page, '**/profiles', (route) => route.fulfill({ json: [ana, beto] }))
  await mockApi(page, '**/communities/mine**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  await mockApi(page, '**/articles/mine**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
}

const card = (page: Page, text: string) => page.locator('.post-card').filter({ hasText: text })

test('el feed muestra bajo el post sus primeras respuestas, con sangría y el padre arriba', async ({ page }) => {
  const parent = makePost(1, { content: 'El post padre', commentCount: 5 })
  const requests: URL[] = []
  await mockApi(page, '**/posts?**', (route) => route.fulfill({ json: { data: [parent], total: 1, page: 1, limit: 20 } }))
  await mockApi(page, '**/posts/1/replies**', (route, url) => {
    requests.push(url)
    return route.fulfill({ json: { data: [reply(2, 1, 'Primera respuesta'), reply(3, 1, 'Segunda respuesta'), reply(4, 1, 'Tercera respuesta')], total: 5, page: 1, limit: 3 } })
  })

  await page.goto('/posts')
  const thread = card(page, 'El post padre').getByRole('group', { name: 'Respuestas a esta publicación' })
  await expect(thread.getByRole('listitem')).toHaveCount(3)
  await expect(thread).toContainText('Primera respuesta')
  await expect(thread).toContainText('Beto Gil')
  expect(requests).toHaveLength(1)
  expect(requests[0].searchParams.get('limit')).toBe('3')

  // El padre va arriba y los hijos debajo, más a la derecha que el padre.
  const parentBox = await card(page, 'El post padre').locator('.post-card__content').boundingBox()
  const firstBox = await thread.getByText('Primera respuesta').boundingBox()
  expect(parentBox && firstBox).toBeTruthy()
  expect(firstBox!.y).toBeGreaterThan(parentBox!.y + parentBox!.height)
  expect(firstBox!.x).toBeGreaterThan(parentBox!.x + 20)

  // Quedan 2 por ver: el enlace lleva al post completo.
  await thread.getByRole('link', { name: 'Ver las 2 respuestas más' }).click()
  await expect(page).toHaveURL(/\/posts\/1$/)
})

test('cada respuesta del hilo abre su propia página', async ({ page }) => {
  await mockApi(page, '**/posts?**', (route) => route.fulfill({ json: { data: [makePost(1, { content: 'El post padre', commentCount: 1 })], total: 1, page: 1, limit: 20 } }))
  await mockApi(page, '**/posts/1/replies**', (route) => route.fulfill({ json: { data: [reply(2, 1, 'Una respuesta')], total: 1, page: 1, limit: 3 } }))
  await mockApi(page, '**/posts/2', (route) => route.fulfill({ json: reply(2, 1, 'Una respuesta') }))

  await page.goto('/posts')
  // Con una sola respuesta no hay enlace de "ver más".
  await expect(page.getByRole('link', { name: /respuestas más|la otra respuesta/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Abrir la respuesta de Beto Gil' }).click()
  await expect(page).toHaveURL(/\/posts\/2$/)
})

test('un post sin respuestas no pide hilo, y un fallo del hilo no estorba al post', async ({ page }) => {
  const requested: string[] = []
  await mockApi(page, '**/posts?**', (route) => route.fulfill({
    json: { data: [makePost(1, { content: 'Sin respuestas', commentCount: 0 }), makePost(5, { content: 'Con hilo roto', commentCount: 2 })], total: 2, page: 1, limit: 20 },
  }))
  await mockApi(page, '**/posts/*/replies**', (route, url) => {
    requested.push(url.pathname)
    return route.fulfill({ status: 500, json: { statusCode: 500, message: 'Fallo del servidor' } })
  })

  await page.goto('/posts')
  await expect(card(page, 'Con hilo roto')).toBeVisible()
  await expect(card(page, 'Sin respuestas')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Respuestas a esta publicación' })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(requested).toEqual(['/posts/5/replies'])
})

test('la respuesta hecha desde la tarjeta aparece al instante en el hilo', async ({ page }) => {
  await signIn(page)
  await mockApi(page, '**/posts?**', (route) => route.fulfill({ json: { data: [makePost(1, { content: 'El post padre', commentCount: 0 })], total: 1, page: 1, limit: 20 } }))
  await mockApi(page, '**/posts/1', (route) => route.fulfill({ json: makePost(1, { content: 'El post padre' }) }))
  await mockApi(page, '**/posts', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({ status: 201, json: reply(40, 1, String(body.content), { ownerId: me.id, owner: { id: me.id, name: me.name, username: me.username, profilePhoto: null } }) })
  })

  await page.goto('/posts')
  await expect(page.getByRole('group', { name: 'Respuestas a esta publicación' })).toHaveCount(0)
  await card(page, 'El post padre').getByRole('button', { name: 'Responder' }).click()
  const dialog = page.getByRole('dialog', { name: 'Responder a Ana Ruiz' })
  await dialog.getByRole('textbox', { name: 'Tu respuesta' }).fill('Mi respuesta nueva')
  await dialog.getByRole('button', { name: 'Responder', exact: true }).click()

  const thread = card(page, 'El post padre').getByRole('group', { name: 'Respuestas a esta publicación' })
  await expect(thread).toContainText('Mi respuesta nueva')
  await expect(thread).toContainText('Lector Uno')
  await expect(card(page, 'El post padre')).toContainText('1 respuesta')
  // La respuesta vive en el hilo, no como una tarjeta más del feed.
  await expect(page.locator('.post-card')).toHaveCount(1)
})

test('el icono de publicar está en el feed y, sin sesión, lleva a iniciar sesión', async ({ page }) => {
  await mockApi(page, '**/posts?**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } }))
  await mockApi(page, '**/profiles', (route) => route.fulfill({ json: [ana, beto] }))

  await page.goto('/posts')
  await expect(page.getByLabel('Contenido de la publicación')).toHaveCount(0)
  await page.getByRole('link', { name: 'Publicar un post' }).click()
  await expect(page).toHaveURL(/\/login/)
})
