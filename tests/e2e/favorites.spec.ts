import { expect, test, type Page } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(({ page }) => mockBackgroundApis(page))

const article = {
  id: 42, authorId: 7, title: 'Una idea compartida', description: 'Lectura breve', status: 'PUBLISHED',
  isPremium: false, communityId: null, publishedAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
}
const profile = { id: 2, username: 'lector', name: 'Lector', followersCount: 0, isVerified: false }

async function signIn(page: Page) {
  const payload = btoa(JSON.stringify({ sub: 2, email: 'reader@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), `header.${payload}.signature`)
  await page.route('**/profiles/me', (route) => route.fulfill({ json: profile }))
  await page.route('**/follows/following/2', (route) => route.fulfill({ json: [] }))
}

async function library(page: Page) {
  await page.route('**/article-tags', (route) => route.fulfill({ json: [] }))
  await page.route('**/profiles', (route) => route.fulfill({ json: [] }))
  await page.route('**/profiles/7', (route) => route.fulfill({ json: { id: 7, name: 'Ana Pérez', username: 'ana', followersCount: 0 } }))
  await page.route('**/collections', (route) => route.fulfill({ json: [] }))
  await page.route((url) => url.pathname.endsWith('/communities/mine'),
    (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  await page.route((url) => url.pathname === '/articles', (route) => {
    if (route.request().resourceType() === 'document') return route.fallback()
    return route.fulfill({ json: { data: [article], total: 1, page: 1, limit: 10 } })
  })
}

test('un visitante puede iniciar sesión desde el botón de favorito', async ({ page }) => {
  await library(page)
  await page.goto('/articles')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: article.title }) })
  await card.getByRole('button', { name: 'Agregar a favoritos' }).click()
  const prompt = page.getByRole('dialog', { name: 'Inicia sesión para continuar' })
  await expect(prompt).toContainText('guardar este ensayo')
  await prompt.getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('marca y desmarca al instante, y revierte un error del servidor', async ({ page }) => {
  await signIn(page)
  await library(page)
  let saved = false
  let rejectNext = false
  await page.route((url) => url.pathname === '/favorites' || url.pathname === '/favorites/42', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { data: saved ? [{ profileId: 2, articleId: 42, createdAt: '2026-11-01T12:00:00.000Z', article }] : [], total: saved ? 1 : 0, page: 1, limit: 100 } })
    if (rejectNext) { rejectNext = false; return route.fulfill({ status: 500, json: { message: 'Error de prueba' } }) }
    saved = route.request().method() === 'POST'
    if (saved) return route.fulfill({ status: 201, json: { profileId: 2, articleId: 42, article } })
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto('/articles')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: article.title }) })
  await card.getByRole('button', { name: 'Agregar a favoritos' }).click()
  await expect(card.getByRole('button', { name: 'Quitar de favoritos' })).toHaveAttribute('aria-pressed', 'true')
  await expect(card.getByRole('button', { name: 'Quitar de favoritos' })).toBeEnabled()
  await card.getByRole('button', { name: 'Quitar de favoritos' }).click()
  await expect(card.getByRole('button', { name: 'Agregar a favoritos' })).toHaveAttribute('aria-pressed', 'false')
  await expect(card.getByRole('button', { name: 'Agregar a favoritos' })).toBeEnabled()
  rejectNext = true
  await card.getByRole('button', { name: 'Agregar a favoritos' }).click()
  await expect(page.getByRole('alert')).toContainText('No se pudo actualizar el favorito')
  await expect(card.getByRole('button', { name: 'Agregar a favoritos' })).toBeVisible()
})

test('Mis favoritos pagina y vuelve a la página anterior al quitar el último', async ({ page }) => {
  await signIn(page)
  let items = Array.from({ length: 11 }, (_, index) => ({ profileId: 2, articleId: index + 1,
    createdAt: '2026-11-01T12:00:00.000Z', article: { ...article, id: index + 1, title: `Ensayo ${index + 1}` } }))
  await page.route((url) => url.pathname === '/favorites' || url.pathname.startsWith('/favorites/'), (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'GET') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1)
      const limit = Number(url.searchParams.get('limit') ?? 10)
      return route.fulfill({ json: { data: items.slice((pageNumber - 1) * limit, pageNumber * limit), total: items.length, page: pageNumber, limit } })
    }
    items = items.filter((item) => item.articleId !== Number(url.pathname.split('/').at(-1)))
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto('/app/favorites')
  await expect(
  page.getByRole('link', { name: 'Ensayo 1', exact: true }),
).toHaveAttribute('href', '/articles/1')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ensayo 11' })).toBeVisible()
  await page.getByRole('button', { name: 'Quitar de favoritos' }).click()
  await expect(page.getByText('Página 1 de 1')).toBeVisible()
  expect(items).toHaveLength(10)
})

test('Mis favoritos muestra estado vacío al quitar el único ensayo', async ({ page }) => {
  await signIn(page)
  let saved = true
  await page.route((url) => url.pathname === '/favorites' || url.pathname === '/favorites/42', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { data: saved ? [{ profileId: 2, articleId: 42, createdAt: '2026-11-01T12:00:00.000Z', article }] : [], total: saved ? 1 : 0, page: 1, limit: 10 } })
    saved = false
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto('/app/favorites')
  await expect(page.getByRole('link', { name: article.title })).toBeVisible()
  await page.getByRole('button', { name: 'Quitar de favoritos' }).click()
  await expect(page.getByRole('heading', { name: 'Aún no tienes favoritos.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explorar ensayos' })).toHaveAttribute('href', '/articles')
})
