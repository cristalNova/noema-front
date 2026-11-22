import { expect, test, type Page } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(({ page }) => mockBackgroundApis(page))

const content = Array.from({ length: 90 }, (_, index) => `Párrafo ${index + 1}. Una idea para seguir leyendo y llegar al final del ensayo.`).join('\n\n')
const article = {
  id: 42, authorId: 7, author: { id: 7, name: 'Ana Pérez', username: 'ana' }, title: 'Un ensayo largo',
  description: 'Una lectura de prueba', content, status: 'PUBLISHED', locked: false,
  isPremium: false, communityId: null, publishedAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
}
const profile = { id: 2, username: 'lector', name: 'Lector', followersCount: 0, isVerified: false }

async function signIn(page: Page) {
  const payload = btoa(JSON.stringify({ sub: 2, email: 'reader@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), `header.${payload}.signature`)
  await page.route('**/profiles/me', (route) => route.fulfill({ json: profile }))
}

async function mockArticle(page: Page) {
  await page.route('**/articles/42', (route) => route.request().resourceType() === 'document'
    ? route.fallback() : route.fulfill({ json: article }))
  await page.route('**/comments/article/42**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
}

test('guarda el avance tras la pausa y marca completado al llegar al final', async ({ page }) => {
  await signIn(page)
  await mockArticle(page)
  const writes: number[] = []
  await page.route('**/progress/42', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ status: 404, json: { message: 'Sin progreso' } })
    const { percentage } = route.request().postDataJSON() as { percentage: number }
    writes.push(percentage)
    return route.fulfill({ json: { profileId: 2, articleId: 42, percentage, isCompleted: percentage === 100, article } })
  })
  await page.goto('/articles/42')
  await expect(page.locator('.article-reader__progress')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('progressbar', { name: /Progreso de lectura/ })).toHaveAttribute('value', '0')
  await page.evaluate(() => {
    const element = document.querySelector('.article-reader__content')!
    const top = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, top + element.getBoundingClientRect().height * 0.5 - window.innerHeight)
  })
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0]).toBeGreaterThan(0)
  expect(writes[0]).toBeLessThan(100)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(page.getByText('Ensayo completado')).toBeVisible()
  await expect.poll(() => writes.at(-1)).toBe(100)
  expect(writes.length).toBeLessThanOrEqual(2)
})

test('Continuar leyendo retoma la posición y permite reiniciar, sin mostrar completados', async ({ page }) => {
  await signIn(page)
  await mockArticle(page)
  let saved = true
  const entry = { profileId: 2, articleId: 42, percentage: 45, isCompleted: false, lastReadAt: '2026-11-01T12:00:00.000Z', article }
  await page.route((url) => url.pathname === '/progress' || url.pathname === '/progress/42', (route) => {
    if (route.request().method() === 'DELETE') { saved = false; return route.fulfill({ status: 204, body: '' }) }
    if (route.request().method() === 'PUT') return route.fulfill({ json: entry })
    if (new URL(route.request().url()).pathname === '/progress/42') return route.fulfill({ json: entry })
    return route.fulfill({ json: { data: saved ? [entry, { ...entry, articleId: 43, isCompleted: true, percentage: 100, article: { ...article, id: 43, title: 'Ensayo completado' } }] : [], total: saved ? 2 : 0, page: 1, limit: 100 } })
  })
  await page.goto('/app/continue-reading')
  await expect(page.getByRole('heading', { name: 'Un ensayo largo' })).toBeVisible()
  await expect(page.getByText('45 % leído')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ensayo completado' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Continuar', exact: true }).click()
  await expect(page).toHaveURL(/\/articles\/42\?resume=1$/)
  await expect(page.locator('.article-reader__progress')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('progressbar', { name: /Progreso de lectura/ })).toHaveAttribute('value', '45')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.goto('/app/continue-reading')
  await page.getByRole('button', { name: 'Reiniciar progreso' }).click()
  await expect(page.getByRole('heading', { name: 'No tienes ensayos en curso.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explorar ensayos' })).toHaveAttribute('href', '/articles')
})
