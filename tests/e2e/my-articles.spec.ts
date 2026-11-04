import { expect, test, type Page } from '@playwright/test'

const base = { authorId: 8, description: '', communityId: null, articleTags: [], isPremium: false }
const articles = [
  { ...base, id: 1, title: 'Primer borrador', status: 'DRAFT', updatedAt: '2026-11-03T15:00:00.000Z' },
  { ...base, id: 2, title: 'Segundo borrador', status: 'DRAFT', updatedAt: '2026-11-02T15:00:00.000Z' },
  { ...base, id: 3, title: 'Ensayo publicado', status: 'PUBLISHED', updatedAt: '2026-11-01T15:00:00.000Z' },
  { ...base, id: 4, title: 'Ensayo archivado', status: 'ARCHIVED', updatedAt: '2026-10-01T15:00:00.000Z' },
]

function token() {
  return `header.${btoa(JSON.stringify({ sub: '8', email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
}
async function setup(page: Page) {
  await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token())
  await page.route((url) => url.pathname.endsWith('/profiles/me'), (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return route.fulfill({ json: { id: 8, username: 'ana', name: 'Ana' } })
  })
  await page.route((url) => url.pathname === '/articles/mine', (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return route.fulfill({ json: { data: articles, total: articles.length, page: 1, limit: 100 } })
  })
}

test('las pestañas filtran por estado y muestran cuántos ensayos hay en cada una', async ({ page }) => {
  await setup(page)
  await page.goto('/app/articles')
  const tabs = page.getByRole('navigation', { name: 'Filtrar ensayos por estado' })
  await expect(tabs.getByRole('button')).toHaveText(['Todos 4', 'Borradores 2', 'Publicados 1', 'Archivados 1'])
  await expect(tabs.getByRole('button', { name: /^Todos/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('tbody tr')).toHaveCount(4)

  await tabs.getByRole('button', { name: /^Borradores/ }).click()
  await expect(tabs.getByRole('button', { name: /^Borradores/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Primer borrador', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ensayo publicado', exact: true })).toHaveCount(0)
})

test('cada ensayo ofrece editar, eliminar y solo los cambios de estado que le corresponden', async ({ page }) => {
  await setup(page)
  await page.goto('/app/articles')
  const draft = page.locator('tr', { hasText: 'Primer borrador' })
  await expect(draft.getByRole('link', { name: 'Editar “Primer borrador”' })).toHaveAttribute('href', '/app/articles/1/edit')
  await expect(draft.getByRole('button', { name: 'Eliminar “Primer borrador”' })).toBeVisible()
  await expect(draft.getByRole('button', { name: 'Publicar “Primer borrador”' })).toBeVisible()
  await expect(draft.getByRole('button', { name: 'Archivar “Primer borrador”' })).toBeVisible()
  await expect(draft.getByRole('button', { name: /Volver a borrador/ })).toHaveCount(0)

  const published = page.locator('tr', { hasText: 'Ensayo publicado' })
  await expect(published.getByRole('button', { name: 'Volver a borrador “Ensayo publicado”' })).toBeVisible()
  await expect(published.getByRole('button', { name: /^Publicar/ })).toHaveCount(0)

  // Los botones siguen abriendo su confirmación.
  await draft.getByRole('button', { name: 'Eliminar “Primer borrador”' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('en móvil las pestañas y las acciones caben sin scroll horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await setup(page)
  await page.goto('/app/articles')
  await expect(page.getByRole('button', { name: 'Editar “Primer borrador”' }).or(page.getByRole('link', { name: 'Editar “Primer borrador”' }))).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const edit = page.getByRole('link', { name: 'Editar “Primer borrador”' })
  const box = await edit.boundingBox()
  expect(box && box.x + box.width <= 375).toBe(true)
})
