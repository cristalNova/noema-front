import { expect, test, type Page, type Route } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(({ page }) => mockBackgroundApis(page))

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }
const ana = { id: 7, name: 'Ana Ruiz', username: 'ana', profilePhoto: null }
const beto = { id: 9, name: 'Beto Gil', username: 'beto', profilePhoto: null }

function makePost(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id, ownerId: ana.id, owner: ana, communityId: null, articleId: null, article: null, parentPostId: null, postType: 'ORIGINAL',
    visibility: 'PUBLIC', content: `Publicación número ${id}`, likes: 0, repostCount: 0, commentCount: 2, createdAt: '2026-11-01T12:00:00.000Z', ...overrides,
  }
}

const original = makePost(1, { content: 'El post original' })

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
  // Opciones de los filtros del feed: sin mock llegarían al backend real con un token falso (401 y sesión cerrada).
  await mockApi(page, '**/profiles', (route) => route.fulfill({ json: [ana, beto] }))
  await mockApi(page, '**/communities/mine**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  await mockApi(page, '**/articles/mine**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
}

/** Feed con `feed` y un POST /posts que registra lo que se envía y responde con `created`. */
async function mockPosts(page: Page, feed: unknown[], created: (body: Record<string, unknown>) => unknown | { status: number; json: unknown }) {
  const sent: Record<string, unknown>[] = []
  await mockApi(page, '**/posts?**', (route) => route.fulfill({ json: { data: feed, total: feed.length, page: 1, limit: 20 } }))
  await mockApi(page, '**/posts/1', (route) => route.fulfill({ json: original }))
  await mockApi(page, '**/posts', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    sent.push(body)
    const result = created(body) as { status?: number; json?: unknown }
    if (result && typeof result === 'object' && 'status' in result && 'json' in result) return route.fulfill({ status: result.status, json: result.json })
    return route.fulfill({ status: 201, json: result })
  })
  return sent
}

const card = (page: Page, text: string) => page.locator('.post-card').filter({ hasText: text })

test('cada post ofrece Responder, Repostear y Citar', async ({ page }) => {
  await signIn(page)
  await mockPosts(page, [original], () => ({}))
  await page.goto('/posts')

  const actions = card(page, 'El post original').getByRole('group', { name: 'Acciones de la publicación' })
  await expect(actions.getByRole('button', { name: 'Responder' })).toBeEnabled()
  await expect(actions.getByRole('button', { name: 'Repostear' })).toBeEnabled()
  await expect(actions.getByRole('button', { name: 'Citar' })).toBeEnabled()
})

test('responder abre el compositor con el post original a la vista y publica la respuesta', async ({ page }) => {
  await signIn(page)
  const sent = await mockPosts(page, [original], (body) => makePost(30, { ownerId: me.id, owner: me, postType: 'REPLY', parentPostId: 1, content: body.content, commentCount: 0 }))
  await page.goto('/posts')

  await card(page, 'El post original').getByRole('button', { name: 'Responder' }).click()
  const dialog = page.getByRole('dialog', { name: 'Responder a Ana Ruiz' })
  await expect(dialog.getByRole('blockquote', { name: 'Publicación original' })).toContainText('El post original')
  const submit = dialog.getByRole('button', { name: 'Responder', exact: true })
  await expect(submit).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Tu respuesta' }).fill('  Estoy de acuerdo  ')
  await submit.click()

  await expect(dialog).toBeHidden()
  expect(sent).toEqual([{ postType: 'REPLY', parentPostId: 1, content: 'Estoy de acuerdo' }])
  const original1 = card(page, 'El post original')
  await expect(original1.getByRole('status').filter({ hasText: 'Tu respuesta se publicó.' })).toBeVisible()
  await expect(original1).toContainText('3 respuestas')
  // Las respuestas no se agregan al feed: viven en el detalle de su post.
  await expect(page.locator('.post-card')).toHaveCount(1)
})

test('citar muestra el original como contexto y la cita aparece con el original incrustado', async ({ page }) => {
  await signIn(page)
  const sent = await mockPosts(page, [original], (body) => makePost(31, { ownerId: me.id, owner: me, postType: 'QUOTE', parentPostId: 1, content: body.content }))
  await page.goto('/posts')

  await card(page, 'El post original').getByRole('button', { name: 'Citar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Citar a Ana Ruiz' })
  await expect(dialog.getByRole('blockquote', { name: 'Publicación original' })).toContainText('El post original')
  await dialog.getByRole('textbox', { name: 'Tu comentario sobre esta publicación' }).fill('Esto es clave')
  await dialog.getByRole('button', { name: 'Publicar cita' }).click()

  await expect(dialog).toBeHidden()
  expect(sent).toEqual([{ postType: 'QUOTE', parentPostId: 1, content: 'Esto es clave' }])
  const quote = card(page, 'Esto es clave')
  await expect(quote).toBeVisible()
  await expect(quote.getByRole('region', { name: 'Publicación original' })).toContainText('El post original')
  await expect(quote.getByRole('region', { name: 'Publicación original' })).toContainText('Ana Ruiz')
})

test('repostear se confirma con un solo gesto, sin compositor', async ({ page }) => {
  await signIn(page)
  const sent = await mockPosts(page, [original], () => makePost(32, { ownerId: me.id, owner: me, postType: 'REPOST', parentPostId: 1, content: null }))
  await page.goto('/posts')

  await card(page, 'El post original').getByRole('button', { name: 'Repostear' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Republicaste esta publicación.' })).toBeVisible()
  expect(sent).toEqual([{ postType: 'REPOST', parentPostId: 1 }])
  // El repost aparece arriba, con el original incrustado.
  const repost = page.locator('.post-card').filter({ hasText: 'Republicó una publicación.' })
  await expect(repost.getByRole('region', { name: 'Publicación original' })).toContainText('El post original')
})

test('si ya republicaste, se avisa y no se duplica', async ({ page }) => {
  await signIn(page)
  await mockPosts(page, [original], () => ({ status: 409, json: { statusCode: 409, message: 'Ya republicaste esta publicación' } }))
  await page.goto('/posts')

  await card(page, 'El post original').getByRole('button', { name: 'Repostear' }).click()
  await expect(page.getByRole('alert')).toContainText('Ya republicaste esta publicación')
  await expect(page.locator('.post-card')).toHaveCount(1)
})

test('las respuestas se enlazan a su post padre y los reposts y citas muestran el original incrustado', async ({ page }) => {
  await signIn(page)
  const reply = makePost(3, { owner: beto, ownerId: beto.id, postType: 'REPLY', parentPostId: 1, content: 'Una respuesta' })
  const quote = makePost(4, { owner: beto, ownerId: beto.id, postType: 'QUOTE', parentPostId: 1, content: 'Una cita' })
  const repost = makePost(5, { owner: beto, ownerId: beto.id, postType: 'REPOST', parentPostId: 1, content: null })
  await mockPosts(page, [reply, quote, repost], () => ({}))
  await page.goto('/posts')

  await expect(card(page, 'Una respuesta').getByRole('link', { name: 'Ana Ruiz' })).toHaveAttribute('href', '/posts/1')
  await expect(card(page, 'Una respuesta')).toContainText('En respuesta a')
  for (const text of ['Una cita', 'Republicó una publicación.']) {
    const embedded = card(page, text).getByRole('region', { name: 'Publicación original' })
    await expect(embedded).toContainText('El post original')
    await expect(embedded.getByRole('link', { name: 'Ver original' })).toHaveAttribute('href', '/posts/1')
  }
})

test('si el original ya no está disponible, la tarjeta lo dice y no permite repostear ni citar', async ({ page }) => {
  await signIn(page)
  const repost = makePost(5, { owner: beto, ownerId: beto.id, postType: 'REPOST', parentPostId: 99, content: null })
  await mockPosts(page, [repost], () => ({}))
  await mockApi(page, '**/posts/99', (route) => route.fulfill({ status: 404, json: { statusCode: 404, message: 'Publicación no disponible' } }))
  await page.goto('/posts')

  const item = page.locator('.post-card')
  await expect(item.getByText('La publicación original ya no está disponible para ti.')).toBeVisible()
  await expect(item.getByRole('button', { name: 'Repostear' })).toBeDisabled()
  await expect(item.getByRole('button', { name: 'Citar' })).toBeDisabled()
  await expect(item.getByRole('button', { name: 'Responder' })).toBeEnabled()
})

test('un post solo para seguidores se puede responder, pero no republicar ni citar', async ({ page }) => {
  await signIn(page)
  const restricted = makePost(6, { content: 'Solo para seguidores', visibility: 'FOLLOWERS' })
  await mockPosts(page, [restricted], () => ({}))
  await page.goto('/posts')

  const item = card(page, 'Solo para seguidores')
  await expect(item.getByRole('button', { name: 'Responder' })).toBeEnabled()
  await expect(item.getByRole('button', { name: 'Repostear' })).toBeDisabled()
  await expect(item.getByRole('button', { name: 'Citar' })).toBeDisabled()
})

test('un visitante que intenta cualquiera de las acciones es dirigido a iniciar sesión', async ({ page }) => {
  const sent = await mockPosts(page, [original], () => ({}))
  await page.goto('/posts')

  const item = card(page, 'El post original')
  const prompt = page.getByRole('dialog', { name: 'Inicia sesión para continuar' })
  for (const [name, reason] of [['Responder', 'responder'], ['Repostear', 'republicar'], ['Citar', 'citar']]) {
    await item.getByRole('button', { name, exact: true }).click()
    await expect(prompt).toContainText(reason)
    await prompt.getByRole('button', { name: 'Ahora no' }).click()
    await expect(prompt).toBeHidden()
  }
  await item.getByRole('button', { name: 'Citar' }).click()
  await prompt.getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(sent).toEqual([])
})

test('en el detalle, la respuesta nueva aparece en la lista sin recargar', async ({ page }) => {
  await signIn(page)
  let replies: unknown[] = []
  await mockApi(page, '**/posts/1', (route) => route.fulfill({ json: original }))
  await mockApi(page, '**/posts/1/replies**', (route) => route.fulfill({ json: { data: replies, total: replies.length, page: 1, limit: 20 } }))
  await mockApi(page, '**/comments/post/1**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  await mockApi(page, '**/posts', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    const created = makePost(40, { ownerId: me.id, owner: me, postType: 'REPLY', parentPostId: 1, content: body.content, commentCount: 0 })
    replies = [created]
    return route.fulfill({ status: 201, json: created })
  })
  await page.goto('/posts/1')

  await expect(page.getByText('Todavía no hay respuestas visibles para ti.')).toBeVisible()
  await page.locator('.post-detail__main').getByRole('button', { name: 'Responder' }).click()
  const dialog = page.getByRole('dialog', { name: 'Responder a Ana Ruiz' })
  await dialog.getByRole('textbox', { name: 'Tu respuesta' }).fill('Mi respuesta desde el detalle')
  await dialog.getByRole('button', { name: 'Responder', exact: true }).click()

  const list = page.getByRole('list', { name: 'Respuestas de la publicación' })
  await expect(list).toContainText('Mi respuesta desde el detalle')
  await expect(list.getByRole('link', { name: 'Ana Ruiz' })).toHaveAttribute('href', '/posts/1')
})
