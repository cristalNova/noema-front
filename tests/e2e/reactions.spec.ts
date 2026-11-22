import { expect, test, type Page, type Route } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(({ page }) => mockBackgroundApis(page))

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }
const ana = { id: 7, username: 'ana', name: 'Ana Ruiz' }

const essay = {
  id: 5, authorId: 7, title: 'Un ensayo', description: '', content: 'El texto del ensayo.', isPremium: false, locked: false,
  status: 'PUBLISHED', communityId: null, publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
}
const comment = {
  id: 11, authorId: ana.id, author: ana, articleId: 5, postId: null, parentCommentId: null, content: 'Un comentario',
  createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z',
}
const post = {
  id: 1, ownerId: ana.id, owner: { ...ana, profilePhoto: null }, communityId: null, articleId: null, article: null, parentPostId: null,
  postType: 'ORIGINAL', visibility: 'PUBLIC', content: 'Una publicación', likes: 0, repostCount: 0, commentCount: 0, createdAt: '2026-11-01T12:00:00.000Z',
}

type Summary = { total: number; byType: { LIKE: number; LOVE: number; INSIGHTFUL: number }; mine: string | null }
const summary = (like = 0, love = 0, insightful = 0, mine: string | null = null): Summary => ({ total: like + love + insightful, byType: { LIKE: like, LOVE: love, INSIGHTFUL: insightful }, mine })

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

async function signIn(page: Page, hasProfile = true) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  // El NavBar consulta esto periódicamente: sin mock llega al backend real y su 401 cierra la sesión.
  await mockApi(page, '**/notifications/unread-count', (route) => route.fulfill({ json: { unread: 0 } }))
  await mockApi(page, '**/profiles/me', (route) => hasProfile
    ? route.fulfill({ json: me })
    : route.fulfill({ status: 404, json: { statusCode: 404, message: 'Perfil no encontrado' } }))
}

/** Servidor de reacciones en memoria: responde lo que el cliente espera y registra las escrituras. */
async function mockReactions(page: Page, initial: Record<string, Summary>) {
  const state = { ...initial }
  const writes: string[] = []
  await mockApi(page, '**/reactions/**', (route, url) => {
    const key = url.pathname.replace('/reactions/', '')
    const request = route.request()
    const current = state[key] ?? summary()
    if (request.method() === 'GET') return route.fulfill({ json: current })
    const next = { ...current, byType: { ...current.byType } } as Summary
    if (next.mine) next.byType[next.mine as 'LIKE'] -= 1
    if (request.method() === 'PUT') {
      const { type } = request.postDataJSON() as { type: 'LIKE' | 'LOVE' | 'INSIGHTFUL' }
      next.byType[type] += 1
      next.mine = type
      writes.push(`PUT ${key} ${type}`)
      state[key] = next
      return route.fulfill({ json: { id: 1, type } })
    }
    next.mine = null
    writes.push(`DELETE ${key}`)
    state[key] = next
    return route.fulfill({ status: 204 })
  })
  return writes
}

async function mockEssay(page: Page) {
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: essay }))
  await mockApi(page, '**/comments/article/5**', (route) => route.fulfill({ json: { data: [comment], total: 1, page: 1, limit: 100 } }))
  await mockApi(page, '**/reviews/article/5', (route) => route.fulfill({ json: [] }))
}

const reaction = (scope: ReturnType<Page['locator']>, name: string) => scope.getByRole('button', { name: new RegExp(`^${name}`) })

test('el ensayo muestra las tres reacciones con su conteo', async ({ page }) => {
  await mockEssay(page)
  await mockReactions(page, { 'article/5': summary(3, 12, 1) })
  await page.goto('/articles/5')

  const bar = page.getByRole('group', { name: 'Reacciones a este ensayo' })
  await expect(reaction(bar, 'Me gusta')).toHaveText(/Me gusta\s*3/)
  await expect(reaction(bar, 'Me encanta')).toHaveText(/Me encanta\s*12/)
  await expect(reaction(bar, 'Esclarecedor')).toHaveText(/Esclarecedor\s*1/)
  await expect(bar.getByRole('button', { pressed: true })).toHaveCount(0)
})

test('reaccionar actualiza el conteo al instante, otra reacción reemplaza a la anterior y la misma se quita', async ({ page }) => {
  await signIn(page)
  await mockEssay(page)
  const writes = await mockReactions(page, { 'article/5': summary(3, 12, 1) })
  await page.goto('/articles/5')

  const bar = page.getByRole('group', { name: 'Reacciones a este ensayo' })
  const like = reaction(bar, 'Me gusta')
  const love = reaction(bar, 'Me encanta')

  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  await expect(like).toContainText('4')

  // Otra reacción: la anterior baja y la nueva sube.
  await love.click()
  await expect(love).toHaveAttribute('aria-pressed', 'true')
  await expect(love).toContainText('13')
  await expect(like).toHaveAttribute('aria-pressed', 'false')
  await expect(like).toContainText('3')

  // La misma otra vez: se quita.
  await love.click()
  await expect(love).toHaveAttribute('aria-pressed', 'false')
  await expect(love).toContainText('12')
  await expect(bar.getByRole('button', { pressed: true })).toHaveCount(0)

  await expect.poll(() => writes).toEqual(['PUT article/5 LIKE', 'PUT article/5 LOVE', 'DELETE article/5'])
})

test('mi reacción de antes aparece resaltada al abrir', async ({ page }) => {
  await signIn(page)
  await mockEssay(page)
  await mockReactions(page, { 'article/5': summary(0, 0, 2, 'INSIGHTFUL') })
  await page.goto('/articles/5')

  const bar = page.getByRole('group', { name: 'Reacciones a este ensayo' })
  await expect(reaction(bar, 'Esclarecedor')).toHaveAttribute('aria-pressed', 'true')
  await expect(bar.getByRole('button', { pressed: true })).toHaveCount(1)
})

test('un visitante ve los conteos y al reaccionar se le pide iniciar sesión', async ({ page }) => {
  await mockEssay(page)
  const writes = await mockReactions(page, { 'article/5': summary(3, 12, 1) })
  await page.goto('/articles/5')

  const bar = page.getByRole('group', { name: 'Reacciones a este ensayo' })
  await expect(reaction(bar, 'Me encanta')).toContainText('12')
  await reaction(bar, 'Me encanta').click()

  const prompt = page.getByRole('dialog', { name: 'Inicia sesión para continuar' })
  await expect(prompt).toContainText('reaccionar')
  await expect(reaction(bar, 'Me encanta')).toContainText('12')
  await prompt.getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(writes).toEqual([])
})

test('quien tiene sesión pero no perfil es dirigido a crearlo', async ({ page }) => {
  await signIn(page, false)
  await mockEssay(page)
  const writes = await mockReactions(page, { 'article/5': summary(1) })
  await page.goto('/articles/5')

  await reaction(page.getByRole('group', { name: 'Reacciones a este ensayo' }), 'Me gusta').click()
  await expect(page).toHaveURL(/\/profile\/new$/)
  expect(writes).toEqual([])
})

test('si el servidor rechaza la reacción, se vuelve al estado real y se avisa', async ({ page }) => {
  await signIn(page)
  await mockEssay(page)
  await mockApi(page, '**/reactions/article/5', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: summary(3, 12, 1) })
    return route.fulfill({ status: 500, json: { statusCode: 500, message: 'No se pudo guardar la reacción' } })
  })
  await page.goto('/articles/5')

  const like = reaction(page.getByRole('group', { name: 'Reacciones a este ensayo' }), 'Me gusta')
  await like.click()
  await expect(page.getByRole('alert')).toContainText('No se pudo guardar la reacción')
  await expect(like).toHaveAttribute('aria-pressed', 'false')
  await expect(like).toContainText('3')
})

test('los comentarios y los posts también tienen su selector, cada uno con sus propios conteos', async ({ page }) => {
  await signIn(page)
  await mockEssay(page)
  await mockApi(page, '**/posts?**', (route) => route.fulfill({ json: { data: [post], total: 1, page: 1, limit: 20 } }))
  await mockApi(page, '**/posts/1', (route) => route.fulfill({ json: post }))
  await mockApi(page, '**/posts/1/replies**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } }))
  await mockApi(page, '**/comments/post/1**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  const writes = await mockReactions(page, { 'comment/11': summary(0, 4, 0), 'post/1': summary(7, 0, 0) })

  await page.goto('/articles/5')
  const onComment = page.getByRole('group', { name: 'Reacciones al comentario de Ana Ruiz' })
  await expect(reaction(onComment, 'Me encanta')).toContainText('4')
  await reaction(onComment, 'Me gusta').click()
  await expect(reaction(onComment, 'Me gusta')).toContainText('1')
  await expect.poll(() => writes).toEqual(['PUT comment/11 LIKE'])

  await page.goto('/posts/1')
  const onPost = page.getByRole('group', { name: 'Reacciones a esta publicación' })
  await expect(reaction(onPost, 'Me gusta')).toContainText('7')
  await reaction(onPost, 'Esclarecedor').click()
  await expect(reaction(onPost, 'Esclarecedor')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => writes).toEqual(['PUT comment/11 LIKE', 'PUT post/1 INSIGHTFUL'])
})
