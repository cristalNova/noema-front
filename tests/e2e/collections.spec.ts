import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 8, username: 'autor', name: 'Autor', isVerified: false, followersCount: 0 }
function token() {
  return `header.${btoa(JSON.stringify({ sub: '8', email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
}
async function api(page: Page, pathname: string, handler: (route: Route) => void | Promise<void>) {
  await page.route((url) => url.pathname.endsWith(pathname), (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return handler(route)
  })
}
async function setup(page: Page, collections: unknown[]) {
  await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token())
  await api(page, '/profiles/me', (route) => route.fulfill({ json: profile }))
  await api(page, '/collections', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: collections })
    const created = { id: 100, authorId: 8, title: 'Nueva serie', description: 'Ensayos relacionados' }
    collections.unshift(created)
    return route.fulfill({ status: 201, json: created })
  })
  await api(page, '/articles/mine', (route) => route.fulfill({ json: { data: [{ id: 5, title: 'Ensayo', status: 'DRAFT', collectionId: 1 }], total: 1, page: 1, limit: 100 } }))
}

test('sin colecciones ofrece crear la primera', async ({ page }) => {
  await setup(page, [])
  await page.goto('/app/collections')
  await expect(page.getByRole('heading', { name: 'Aún no tienes colecciones.' })).toBeVisible()
  await page.getByRole('link', { name: 'Crear colección' }).last().click()
  await expect(page).toHaveURL(/\/app\/collections\/new$/)
})

test('lista colecciones propias, cuenta ensayos y pagina', async ({ page }) => {
  await setup(page, Array.from({ length: 9 }, (_, i) => ({ id: i + 1, authorId: 8, title: `Serie ${i + 1}`, description: `Descripción ${i + 1}` })))
  await page.goto('/app/collections')
  const list = page.getByRole('list', { name: 'Mis colecciones' })
  await expect(list.getByRole('listitem')).toHaveCount(8)
  await expect(list.getByRole('listitem').first()).toContainText('1 ensayo')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await expect(list).toContainText('Serie 9')
})

test('exige título y descripción y guarda la colección', async ({ page }) => {
  await setup(page, [])
  await page.goto('/app/collections/new')
  await page.getByRole('button', { name: 'Crear colección' }).click()
  await expect(page.getByText('El título es obligatorio.')).toBeVisible()
  await expect(page.getByText('La descripción es obligatoria.')).toBeVisible()
  await page.getByLabel('Título *').fill('Nueva serie')
  await page.getByLabel('Descripción *').fill('Ensayos relacionados')
  await page.getByRole('button', { name: 'Crear colección' }).click()
  await expect(page).toHaveURL(/\/app\/collections$/)
  await expect(page.getByRole('list', { name: 'Mis colecciones' })).toContainText('Nueva serie')
})

