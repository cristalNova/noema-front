import { expect, test, type Page } from '@playwright/test'

const ME = 8
const collections = [
  { id: 1, authorId: ME, title: 'Serie de la memoria', description: 'Ensayos sobre recordar.' },
  { id: 2, authorId: ME, title: 'Colección vacía', description: 'Todavía sin ensayos.' },
  { id: 3, authorId: 99, title: 'Colección ajena', description: 'De otra persona.' },
]
const base = { authorId: ME, communityId: null, articleTags: [], isPremium: false, description: '' }
const articles = [
  { ...base, id: 11, title: 'Tercer ensayo', status: 'PUBLISHED', collectionId: 1, collectionPosition: 3, updatedAt: '2026-11-01T10:00:00.000Z' },
  { ...base, id: 12, title: 'Primer ensayo', status: 'PUBLISHED', collectionId: 1, collectionPosition: 1, updatedAt: '2026-11-02T10:00:00.000Z' },
  { ...base, id: 13, title: 'Segundo en borrador', status: 'DRAFT', collectionId: 1, collectionPosition: 2, updatedAt: '2026-11-03T10:00:00.000Z' },
  { ...base, id: 14, title: 'Aún sin lugar', status: 'ARCHIVED', collectionId: 1, collectionPosition: null, updatedAt: '2026-10-01T10:00:00.000Z' },
  { ...base, id: 15, title: 'De otra colección', status: 'PUBLISHED', collectionId: 9, collectionPosition: 1, updatedAt: '2026-11-01T10:00:00.000Z' },
]

function token() {
  return `header.${btoa(JSON.stringify({ sub: String(ME), email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
}
async function setup(page: Page) {
  await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token())
  await page.route(() => true, (route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
    const { pathname, searchParams } = new URL(request.url())
    if (pathname === '/notifications/unread-count') return route.fulfill({ json: { unread: 0 } })
    if (pathname === '/profiles/me') return route.fulfill({ json: { id: ME, username: 'ana', name: 'Ana' } })
    if (pathname === '/collections') return route.fulfill({ json: searchParams.has('authorId') ? collections.filter((c) => c.authorId === ME) : collections })
    const one = pathname.match(/^\/collections\/(\d+)$/)
    if (one) {
      const found = collections.find((c) => c.id === Number(one[1]))
      return found ? route.fulfill({ json: found }) : route.fulfill({ status: 404, json: { statusCode: 404, message: 'Colección no encontrada' } })
    }
    if (pathname === '/articles/mine') return route.fulfill({ json: { data: articles, total: articles.length, page: 1, limit: 100 } })
    return route.fallback()
  })
}

test('Mis colecciones enlaza al detalle de cada colección', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections')
  const first = page.getByRole('listitem').filter({ hasText: 'Serie de la memoria' })
  await expect(first).toContainText('4 ensayos')
  await first.getByRole('link', { name: 'Ver los ensayos de “Serie de la memoria”' }).click()
  await expect(page).toHaveURL(/\/app\/collections\/1$/)
  await expect(page.getByRole('heading', { name: 'Serie de la memoria', level: 1 })).toBeVisible()
})

test('el detalle muestra los ensayos en su orden, con su estado y los que no tienen posición al final', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections/1')
  await expect(page.getByText('4 ensayos · 2 publicados')).toBeVisible()

  const ordered = page.getByRole('list', { name: 'Ensayos en orden' })
  await expect(ordered.getByRole('listitem')).toHaveCount(3)
  await expect(ordered.getByRole('heading', { level: 4 })).toHaveText(['Primer ensayo', 'Segundo en borrador', 'Tercer ensayo'])
  await expect(ordered.getByRole('listitem').nth(0)).toContainText('Posición 1')
  await expect(ordered.getByRole('listitem').nth(1)).toContainText('Posición 2')
  await expect(ordered.getByRole('listitem').nth(1)).toContainText('Borrador')
  await expect(ordered.getByRole('listitem').nth(1)).toContainText('Los lectores aún no lo ven')
  await expect(ordered.getByRole('listitem').nth(2)).toContainText('Publicado')

  const loose = page.getByRole('list', { name: 'Ensayos sin posición' })
  await expect(loose.getByRole('heading', { level: 4 })).toHaveText(['Aún sin lugar'])
  await expect(page.getByText('De otra colección')).toHaveCount(0)

  await expect(ordered.getByRole('link', { name: 'Editar “Primer ensayo”' })).toHaveAttribute('href', '/app/articles/12/edit')
  await expect(ordered.getByRole('link', { name: 'Primer ensayo', exact: true })).toHaveAttribute('href', '/app/articles/12')
})

test('una colección sin ensayos invita a asignarlos desde el editor', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections/2')
  await expect(page.getByRole('heading', { name: 'Esta colección aún no tiene ensayos.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Escribir un ensayo' })).toHaveAttribute('href', '/app/articles/new')
})

test('no muestra el detalle de una colección ajena ni de una inexistente', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections/3')
  await expect(page.getByRole('heading', { name: 'Esta colección no es tuya' })).toBeVisible()
  await expect(page.getByText('Colección ajena')).toHaveCount(0)

  await page.goto('/app/collections/404')
  await expect(page.getByText('Esta colección no existe o ya no está disponible.')).toBeVisible()
})
