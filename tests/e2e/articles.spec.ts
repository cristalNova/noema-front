import { expect, test, type Page } from '@playwright/test'

// El listado real no incluye la relación author ni el contenido.
const essay = {
  id: 5, authorId: 7, title: 'El arte de prestar atención',
  description: 'Una pausa para mirar lo cotidiano con otros ojos.',
  status: 'PUBLISHED', isPremium: false, communityId: null,
  publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z',
  articleTags: [{ articleId: 5, tag: 'ideas' }],
}
const content = 'Hay ideas que solo aparecen cuando hacemos una pausa.\n\nEscribir también es una forma de escuchar.'

async function mockArticles(page: Page, options: { total?: number; locked?: boolean; unavailable?: boolean } = {}) {
  await page.route('**/articles**', async (route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
    const url = new URL(request.url())
    if (url.pathname === '/articles') {
      const currentPage = Number(url.searchParams.get('page') ?? 1)
      const data = currentPage === 1 ? [essay] : [{ ...essay, id: 6, title: 'Otra manera de mirar' }]
      return route.fulfill({ json: { data, total: options.total ?? 1, page: currentPage, limit: 10 } })
    }
    if (url.pathname === '/articles/5' && options.unavailable) {
      return route.fulfill({ status: 404, json: { statusCode: 404, message: 'Artículo no encontrado' } })
    }
    if (url.pathname === '/articles/5' || url.pathname === '/articles/mine/5') {
      return route.fulfill({ json: { ...essay, content: options.locked ? 'Solo un adelanto.' : content, locked: options.locked ?? false, isPremium: options.locked ?? false } })
    }
    return route.fulfill({ status: 404, json: { statusCode: 404, message: 'No encontrado' } })
  })
}

test.beforeEach(async ({ page }) => {
  await page.route('**/comments/**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
})

test('el inicio conecta el listado público y permite leer un ensayo sin sesión', async ({ page }) => {
  await mockArticles(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Lee, escribe y comparte ideas' })).toBeVisible()
  await expect(page.getByRole('link', { name: `Leer “${essay.title}”` })).toBeVisible()
  await page.getByRole('link', { name: 'Leer ensayos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ensayos publicados' })).toBeVisible()
  await page.getByRole('link', { name: `Leer “${essay.title}”` }).click()
  await expect(page.getByRole('heading', { name: essay.title, exact: true })).toBeVisible()
  await expect(page.getByText(content, { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Etiquetas' })).toContainText('#ideas')
  await page.reload()
  await expect(page.getByRole('heading', { name: essay.title, exact: true })).toBeVisible()
})

test('el listado permite cambiar de página y volver', async ({ page }) => {
  await mockArticles(page, { total: 11 })
  await page.goto('/articles')
  await expect(page.getByText('Página 1 de 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('heading', { name: 'Otra manera de mirar' })).toBeVisible()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  await page.getByRole('button', { name: 'Anterior' }).click()
  await expect(page.getByRole('heading', { name: essay.title })).toBeVisible()
})

test('el lector premium muestra únicamente el adelanto recibido', async ({ page }) => {
  await mockArticles(page, { locked: true })
  await page.goto('/articles/5')
  await expect(page.getByText('Estás leyendo un adelanto premium.')).toBeVisible()
  await expect(page.getByText('Solo un adelanto.', { exact: true })).toBeVisible()
  await expect(page.getByText(content, { exact: true })).toHaveCount(0)
})

test('un ensayo no disponible muestra un mensaje y permite volver', async ({ page }) => {
  await mockArticles(page, { unavailable: true })
  await page.goto('/articles/5')
  await expect(page.getByRole('alert')).toContainText('Este ensayo no está disponible')
  await page.getByRole('link', { name: 'Todas las lecturas' }).click()
  await expect(page.getByRole('heading', { name: 'Ensayos publicados' })).toBeVisible()
})

test('la comunidad permite abrir ensayos aunque la API no incluya autor', async ({ page }) => {
  await mockArticles(page)
  await page.route('**/communities/1', (route) => route.request().resourceType() === 'document' ? route.fallback() : route.fulfill({ json: {
    id: 1, ownerId: 7, name: 'Miradas compartidas', topic: 'Literatura', description: 'Un espacio para conversar.', isPremium: false, tags: [], membersCount: 2,
  } }))
  await page.goto('/communities/1')
  await page.getByRole('link', { name: essay.title, exact: true }).click()
  await expect(page.getByText(content, { exact: true })).toBeVisible()
})

test('el detalle propio permite volver al editor', async ({ page }) => {
  const payload = btoa(JSON.stringify({ sub: 7, email: 'writer@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), `header.${payload}.signature`)
  await page.route('**/profiles/me', (route) => route.fulfill({ json: { id: 7, username: 'writer', name: 'Escritora' } }))
  await mockArticles(page)
  await page.goto('/app/articles/5')
  await expect(page.getByRole('link', { name: 'Editar ensayo' })).toHaveAttribute('href', '/app/articles/5/edit')
  await expect(page.getByText(content, { exact: true })).toBeVisible()
})

test('el inicio, la biblioteca y el lector caben en una pantalla móvil', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await mockArticles(page)
  for (const url of ['/', '/articles', '/articles/5']) {
    await page.goto(url)
    await expect(page.getByRole('link', { name: 'Noema', exact: true })).toBeVisible()
    if (url === '/articles/5') await expect(page.getByText(content, { exact: true })).toBeVisible()
    else await expect(page.getByRole('link', { name: `Leer “${essay.title}”` })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(url === '/' ? 'mobile-home.png' : url === '/articles' ? 'mobile-library.png' : 'mobile-reader.png'), fullPage: true })
  }
})

test('el borrador ofrece las comunidades del usuario y envía la elegida', async ({ page }) => {
  const payload = Buffer.from(JSON.stringify({ sub: '7', email: 'writer@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64')
  const bodies: Record<string, unknown>[] = []
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), `header.${payload}.signature`)
  await page.route('**/profiles/me', (route) => route.fulfill({ json: { id: 7, username: 'writer', name: 'Escritora' } }))
  // GET /communities/mine devuelve membresías con la comunidad anidada, no comunidades.
  await page.route('**/communities/mine**', (route) => route.fulfill({ json: {
    data: [{ profileId: 7, communityId: 3, role: 'MEMBER', status: 'ACTIVE', community: { id: 3, name: 'Club de ciencia' } }],
    total: 1, page: 1, limit: 100,
  } }))
  await page.route('**/articles**', async (route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
    if (request.method() === 'POST') bodies.push(request.postDataJSON())
    return route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json: { ...essay, id: 9, status: 'DRAFT', content, communityId: 3 } })
  })

  await page.goto('/app/articles/new')
  await page.locator('#communityId').selectOption({ label: 'Club de ciencia' })
  await expect(page.locator('#communityId')).toHaveValue('3')
  await page.locator('#title').fill('Un ensayo de comunidad')
  await page.locator('.draft-content').fill(content)
  await page.locator('button[type="submit"]').click()
  await expect.poll(() => bodies.at(-1)?.communityId).toBe(3)
})
