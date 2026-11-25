import { expect, test, type Page } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(({ page }) => mockBackgroundApis(page))

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
async function setup(page: Page, options: { failOrder?: boolean } = {}) {
  const requests: { method: string; pathname: string; body: unknown }[] = []
  await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token())
  await page.route(() => true, (route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
    const { pathname, searchParams } = new URL(request.url())
    if (pathname === '/notifications/unread-count') return route.fulfill({ json: { unread: 0 } })
    if (pathname === '/collections/1/order' && request.method() === 'PUT') {
      requests.push({ method: 'PUT', pathname, body: request.postDataJSON() })
      return options.failOrder
        ? route.fulfill({ status: 400, json: { statusCode: 400, message: 'Los artículos 99 no pertenecen a esta colección' } })
        : route.fulfill({ status: 204 })
    }
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
  return requests
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

test('el detalle muestra los ensayos en su orden y con su estado; los antiguos sin posición van al final', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections/1')
  await expect(page.getByText('4 ensayos · 2 publicados')).toBeVisible()

  const ordered = page.getByRole('list', { name: 'Ensayos en orden' })
  await expect(ordered.getByRole('listitem')).toHaveCount(4)
  await expect(ordered.getByRole('heading', { level: 4 })).toHaveText(['Primer ensayo', 'Segundo en borrador', 'Tercer ensayo', 'Aún sin lugar'])
  // Se numera por lugar en la lista, no por la posición guardada.
  await expect(ordered.getByRole('listitem').nth(0)).toContainText('Posición 1')
  await expect(ordered.getByRole('listitem').nth(3)).toContainText('Posición 4')
  await expect(ordered.getByRole('listitem').nth(1)).toContainText('Borrador')
  await expect(ordered.getByRole('listitem').nth(1)).toContainText('Los lectores aún no lo ven')
  await expect(ordered.getByRole('listitem').nth(2)).toContainText('Publicado')
  await expect(page.getByText('Sin posición asignada')).toHaveCount(0)
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

const ORDERED = ['Primer ensayo', 'Segundo en borrador', 'Tercer ensayo', 'Aún sin lugar']

test('cada ensayo tiene un asa de tres rayitas para arrastrarlo', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections/1')
  const list = page.getByRole('list', { name: 'Ensayos en orden' })
  await expect(list.locator('[data-drag-handle]')).toHaveCount(4)
  await expect(list.locator('[data-drag-handle]').first()).toHaveAttribute('title', 'Arrastra para cambiar el orden')
  await expect(list.locator('[data-drag-handle] svg path').first()).toHaveAttribute('d', 'M2 2h16M2 7h16M2 12h16')
})

test('arrastrar desde el asa cambia el orden y lo guarda con todos los ensayos, también los borradores', async ({ page }) => {
  const requests = await setup(page)
  await page.goto('/app/collections/1')
  const list = page.getByRole('list', { name: 'Ensayos en orden' })
  const titles = list.getByRole('heading', { level: 4 })
  await expect(titles).toHaveText(ORDERED)

  await list.getByRole('listitem').nth(3).locator('[data-drag-handle]').dragTo(list.getByRole('listitem').nth(0), { targetPosition: { x: 60, y: 4 } })
  await expect(titles).toHaveText(['Aún sin lugar', 'Primer ensayo', 'Segundo en borrador', 'Tercer ensayo'])
  await expect(list.getByRole('listitem').nth(0)).toContainText('Posición 1')
  await expect(page.getByRole('status').filter({ hasText: 'Orden guardado' })).toContainText('«Aún sin lugar» ahora es el número 1 de 4')
  expect(requests).toEqual([{ method: 'PUT', pathname: '/collections/1/order', body: { articleIds: [14, 12, 13, 11] } }])
})

test('arrastrar desde el texto de la fila no reordena', async ({ page }) => {
  const requests = await setup(page)
  await page.goto('/app/collections/1')
  const list = page.getByRole('list', { name: 'Ensayos en orden' })
  await list.getByRole('listitem').nth(3).locator('.collection-essay__meta').dragTo(list.getByRole('listitem').nth(0), { targetPosition: { x: 60, y: 4 } })
  await expect(list.getByRole('heading', { level: 4 })).toHaveText(ORDERED)
  expect(requests).toEqual([])
})

test('no hay flechas ni botones de subir y bajar: el orden se cambia arrastrando', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections/1')
  const list = page.getByRole('list', { name: 'Ensayos en orden' })
  await expect(list.getByRole('listitem')).toHaveCount(4)
  await expect(list.getByRole('button', { name: /Subir|Bajar/ })).toHaveCount(0)
  await expect(list.getByText(/[↑↓]/)).toHaveCount(0)
})

test('con el teclado el asa se mueve con las flechas, anuncia el cambio y conserva el foco', async ({ page }) => {
  const requests = await setup(page)
  await page.goto('/app/collections/1')
  const titles = page.getByRole('list', { name: 'Ensayos en orden' }).getByRole('heading', { level: 4 })
  const handle = page.getByRole('button', { name: /^Mover «Primer ensayo»/ })

  await handle.focus()
  await handle.press('ArrowUp') // ya es el primero: no hace nada
  expect(requests).toEqual([])
  await handle.press('ArrowDown')
  await expect(titles).toHaveText(['Segundo en borrador', 'Primer ensayo', 'Tercer ensayo', 'Aún sin lugar'])
  await expect(page.getByRole('status').filter({ hasText: 'Orden guardado' })).toContainText('«Primer ensayo» ahora es el número 2 de 4')
  await expect(handle).toBeFocused()
  expect(requests).toEqual([{ method: 'PUT', pathname: '/collections/1/order', body: { articleIds: [13, 12, 11, 14] } }])
})

test('si el servidor rechaza el orden se restaura el anterior y se avisa', async ({ page }) => {
  const requests = await setup(page, { failOrder: true })
  await page.goto('/app/collections/1')
  const list = page.getByRole('list', { name: 'Ensayos en orden' })
  const titles = list.getByRole('heading', { level: 4 })
  await list.getByRole('listitem').nth(3).locator('[data-drag-handle]').dragTo(list.getByRole('listitem').nth(0), { targetPosition: { x: 60, y: 4 } })
  await expect(page.getByRole('alert').filter({ hasText: 'No se pudo guardar el orden' })).toContainText('no pertenecen a esta colección')
  await expect(titles).toHaveText(ORDERED)
  expect(requests).toHaveLength(1)
})

test('«Editar colección» ya no incluye el orden de los ensayos', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections/1/edit')
  await expect(page.getByLabel('Título *')).toHaveValue('Serie de la memoria')
  await expect(page.getByRole('list', { name: 'Ensayos en orden' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Orden de los ensayos' })).toHaveCount(0)
})
