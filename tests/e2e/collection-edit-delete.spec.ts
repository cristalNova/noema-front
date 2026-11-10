import { expect, test, type Page } from '@playwright/test'

const ME = 8
const base = { authorId: ME, communityId: null, articleTags: [], isPremium: false, description: '' }

function token() {
  return `header.${btoa(JSON.stringify({ sub: String(ME), email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
}

async function setup(page: Page) {
  const collections = [
    { id: 1, authorId: ME, title: 'Serie de la memoria', description: 'Ensayos sobre recordar.' },
    { id: 2, authorId: ME, title: 'Colección vacía', description: 'Todavía sin ensayos.' },
    { id: 3, authorId: 99, title: 'Colección ajena', description: 'De otra persona.' },
  ]
  const articles = [
    { ...base, id: 11, title: 'Primer ensayo', status: 'PUBLISHED', collectionId: 1, collectionPosition: 1, updatedAt: '2026-11-02T10:00:00.000Z' },
    { ...base, id: 12, title: 'Segundo en borrador', status: 'DRAFT', collectionId: 1, collectionPosition: 2, updatedAt: '2026-11-03T10:00:00.000Z' },
  ]
  const requests: { method: string; pathname: string; body: unknown }[] = []
  await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token())
  await page.route(() => true, (route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
    const { pathname, searchParams } = new URL(request.url())
    if (pathname === '/profiles/me') return route.fulfill({ json: { id: ME, username: 'ana', name: 'Ana' } })
    if (pathname === '/collections') return route.fulfill({ json: searchParams.has('authorId') ? collections.filter((c) => c.authorId === ME) : collections })
    const one = pathname.match(/^\/collections\/(\d+)$/)
    if (one) {
      const index = collections.findIndex((c) => c.id === Number(one[1]))
      if (index < 0) return route.fulfill({ status: 404, json: { statusCode: 404, message: 'Colección no encontrada' } })
      if (request.method() === 'PATCH') {
        requests.push({ method: 'PATCH', pathname, body: request.postDataJSON() })
        collections[index] = { ...collections[index], ...request.postDataJSON() }
        return route.fulfill({ json: collections[index] })
      }
      if (request.method() === 'DELETE') {
        requests.push({ method: 'DELETE', pathname, body: null })
        collections.splice(index, 1)
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ json: collections[index] })
    }
    // El NavBar consulta este endpoint periódicamente: sin mock llega al backend real y su 401 cierra la sesión.
    if (pathname === '/notifications/unread-count') return route.fulfill({ json: { unread: 0 } })
    if (pathname === '/articles/mine') return route.fulfill({ json: { data: articles, total: articles.length, page: 1, limit: 100 } })
    return route.fallback()
  })
  return requests
}

test('editar carga los datos actuales, guarda y confirma en el detalle', async ({ page }) => {
  const requests = await setup(page)
  await page.goto('/app/collections/1')
  await page.getByRole('link', { name: 'Editar colección' }).click()
  await expect(page).toHaveURL(/\/app\/collections\/1\/edit$/)
  await expect(page.getByLabel('Título *')).toHaveValue('Serie de la memoria')
  await expect(page.getByLabel('Descripción *')).toHaveValue('Ensayos sobre recordar.')
  await page.getByLabel('Título *').fill('')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('El título es obligatorio.')).toBeVisible()
  await page.getByLabel('Título *').fill('Serie renombrada')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page).toHaveURL(/\/app\/collections\/1$/)
  await expect(page.getByRole('status').filter({ hasText: 'Se guardaron los cambios en “Serie renombrada”.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Serie renombrada', level: 1 })).toBeVisible()
  expect(requests).toEqual([{ method: 'PATCH', pathname: '/collections/1', body: { title: 'Serie renombrada', description: 'Ensayos sobre recordar.' } }])
})

test('eliminar pide confirmación, explica qué pasa con los ensayos y vuelve al listado sin la colección', async ({ page }) => {
  const requests = await setup(page)
  await page.goto('/app/collections/1')
  await page.getByRole('button', { name: 'Eliminar colección' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Eliminar colección?' })
  await expect(dialog).toContainText('Sus 2 ensayos no se eliminan')
  await expect(dialog).toContainText('sin colección')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  expect(requests).toEqual([])

  await page.getByRole('button', { name: 'Eliminar colección' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar definitivamente' }).click()
  await expect(page).toHaveURL(/\/app\/collections$/)
  await expect(page.getByRole('status').filter({ hasText: 'Se eliminó “Serie de la memoria”.' })).toBeVisible()
  const list = page.getByRole('list', { name: 'Mis colecciones' })
  await expect(list).not.toContainText('Serie de la memoria')
  await expect(list).toContainText('Colección vacía')
  expect(requests).toEqual([{ method: 'DELETE', pathname: '/collections/1', body: null }])
})

test('una colección ajena no ofrece editar ni eliminar', async ({ page }) => {
  await setup(page)
  await page.goto('/app/collections/3')
  await expect(page.getByRole('heading', { name: 'Esta colección no es tuya' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Editar colección' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Eliminar colección' })).toHaveCount(0)
  await page.goto('/app/collections/3/edit')
  await expect(page.getByRole('heading', { name: 'Esta colección no es tuya' })).toBeVisible()
  await expect(page.getByLabel('Título *')).toHaveCount(0)
})
