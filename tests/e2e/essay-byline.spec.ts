import { expect, test, type Page, type Route } from '@playwright/test'

// GET /articles solo devuelve authorId y communityId: sin las relaciones author ni community.
const base = { status: 'PUBLISHED', isPremium: false, publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [] }
const inCommunity = { ...base, id: 5, authorId: 8, title: 'Ensayo de comunidad', description: 'Dentro de un club.', communityId: 3 }
const open = { ...base, id: 6, authorId: 9, title: 'Ensayo abierto', description: 'Para todos.', communityId: null }
const content = 'Hay ideas que solo aparecen cuando hacemos una pausa.'

function token() {
  return `header.${btoa(JSON.stringify({ sub: '8', email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
}
async function api(page: Page, match: (pathname: string) => boolean, handler: (route: Route) => void | Promise<void>) {
  await page.route((url) => match(url.pathname), (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return handler(route)
  })
}

async function setup(page: Page, options: { communityUnavailable?: boolean; profileUnavailable?: boolean } = {}) {
  const requested: string[] = []
  await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token())
  await api(page, (p) => p.endsWith('/profiles/me'), (route) => route.fulfill({ json: { id: 8, username: 'ana', name: 'Ana Autora' } }))
  await api(page, (p) => p.endsWith('/profiles'), (route) => route.fulfill({ json: [{ id: 8, name: 'Ana Autora', username: 'ana' }, { id: 9, name: 'Beto Lector', username: 'beto' }] }))
  await api(page, (p) => /\/profiles\/\d+$/.test(p), (route) => {
    requested.push(new URL(route.request().url()).pathname)
    if (options.profileUnavailable) return route.fulfill({ status: 500, json: { statusCode: 500, message: 'Error' } })
    return route.fulfill({ json: { id: 8, username: 'ana', name: 'Ana Autora', isVerified: false, followersCount: 0 } })
  })
  await api(page, (p) => p.endsWith('/communities/mine'), (route) => route.fulfill({ json: {
    data: [{ profileId: 8, communityId: 3, role: 'MEMBER', status: 'ACTIVE', community: { id: 3, name: 'Club de ciencia' } }], total: 1, page: 1, limit: 100,
  } }))
  await api(page, (p) => /\/communities\/\d+$/.test(p), (route) => {
    requested.push(new URL(route.request().url()).pathname)
    return options.communityUnavailable
      ? route.fulfill({ status: 500, json: { statusCode: 500, message: 'Error' } })
      : route.fulfill({ json: { id: 3, name: 'Club de ciencia', topic: 'Ciencia', ownerId: 8, isPremium: false, createdAt: '2026-01-01', tags: [] } })
  })
  await api(page, (p) => p === '/article-tags' || p.endsWith('/collections'), (route) => route.fulfill({ json: [] }))
  await api(page, (p) => p.endsWith('/communities/3/members'), (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } }))
  await api(page, (p) => p === '/posts', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } }))
  await api(page, (p) => p === '/articles', (route) => route.fulfill({ json: { data: [inCommunity, open], total: 2, page: 1, limit: 10 } }))
  await api(page, (p) => p === '/articles/5', (route) => route.fulfill({ json: { ...inCommunity, content, locked: false } }))
  await page.route('**/comments/**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  return requested
}

test('el listado muestra el autor y la comunidad de cada ensayo sin pedir cada perfil', async ({ page }) => {
  const requested = await setup(page)
  await page.goto('/articles')
  const cards = page.locator('.published-essay')
  await expect(cards).toHaveCount(2)

  const first = cards.filter({ hasText: 'Ensayo de comunidad' })
  await expect(first.getByRole('link', { name: 'Ana Autora' })).toHaveAttribute('href', '/profiles/8')
  await expect(first.getByRole('link', { name: 'Club de ciencia' })).toHaveAttribute('href', '/communities/3')

  const second = cards.filter({ hasText: 'Ensayo abierto' })
  await expect(second.getByRole('link', { name: 'Beto Lector' })).toHaveAttribute('href', '/profiles/9')
  await expect(second.getByText('Comunidad', { exact: true })).toHaveCount(0)
  // Los nombres salen de las listas de los filtros: no hay peticiones por id.
  expect(requested).toEqual([])
})

test('el detalle muestra el autor y la comunidad del ensayo', async ({ page }) => {
  const requested = await setup(page)
  await page.goto('/articles/5')
  const header = page.locator('.article-reader__paper header')
  await expect(header.getByRole('link', { name: 'Ana Autora' })).toHaveAttribute('href', '/profiles/8')
  await expect(header.getByRole('link', { name: 'Club de ciencia' })).toHaveAttribute('href', '/communities/3')
  expect(requested.sort()).toEqual(['/communities/3', '/profiles/8'])
})

test('si no se puede cargar la comunidad igual indica que el ensayo es de una comunidad', async ({ page }) => {
  await setup(page, { communityUnavailable: true })
  await page.goto('/articles/5')
  const header = page.locator('.article-reader__paper header')
  await expect(header.locator('.article-byline').getByText('Ensayo de comunidad')).toBeVisible()
  await expect(header.getByRole('link', { name: 'Ana Autora' })).toBeVisible()
})

test('cada card del listado muestra una sola vez el título, la descripción y el enlace al autor', async ({ page }) => {
  await setup(page)
  await page.goto('/articles')
  for (const title of ['Ensayo de comunidad', 'Ensayo abierto']) {
    const card = page.locator('.published-essay').filter({ hasText: title })
    await expect(card.getByRole('heading', { level: 3 })).toHaveCount(1)
    await expect(card.locator('p').filter({ hasText: /^(Dentro de un club|Para todos).$/ })).toHaveCount(1)
    await expect(card.getByRole('link', { name: /perfil|Ana Autora|Beto Lector/ })).toHaveCount(1)
  }
})

test('el detalle del ensayo muestra al autor una sola vez', async ({ page }) => {
  await setup(page)
  await page.goto('/articles/5')
  const header = page.locator('.article-reader__paper header')
  await expect(header.getByRole('link', { name: 'Ana Autora' })).toHaveCount(1)
  await expect(header.getByText('Por', { exact: false })).toHaveCount(1)
})

test('si no se puede cargar el nombre del autor, el enlace sigue llevando a su perfil', async ({ page }) => {
  await setup(page, { profileUnavailable: true })
  await page.goto('/articles/5')
  const header = page.locator('.article-reader__paper header')
  await expect(header.getByRole('link', { name: 'Ver perfil del autor' })).toHaveAttribute('href', '/profiles/8')
})

test('los ensayos dentro de una comunidad muestran su autor', async ({ page }) => {
  await setup(page)
  await page.goto('/communities/3')
  const card = page.locator('.content-card').filter({ hasText: 'Ensayo de comunidad' })
  await expect(card.getByRole('link', { name: 'Ana Autora' })).toHaveAttribute('href', '/profiles/8')
  // La comunidad ya es el contexto de la página: no se repite en cada ensayo.
  await expect(card.getByText('Comunidad', { exact: true })).toHaveCount(0)
})
