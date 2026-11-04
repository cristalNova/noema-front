import { expect, test } from '@playwright/test'

test('el catálogo muestra un estado vacío cuando aún no hay etiquetas', async ({ page }) => {
  await page.route('**/article-tags', (route) => route.fulfill({ json: [] }))
  await page.goto('/tags')
  await expect(page.getByRole('heading', { name: 'Aún no hay temas disponibles.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver ensayos publicados' })).toHaveAttribute('href', '/articles')
})

test('una etiqueta abre los ensayos filtrados por ese tema', async ({ page }) => {
  await page.route('**/article-tags', (route) => route.fulfill({ json: [{ tag: 'ideas', articles: 1 }] }))
  await page.route((url) => url.pathname.endsWith('/articles'), (route) => {
    if (route.request().resourceType() === 'document') return route.fallback()
    return route.fulfill({ json: { data: [{
      id: 5, authorId: 7, title: 'Una idea compartida', description: 'Para leer con calma.',
      status: 'PUBLISHED', isPremium: false, communityId: null,
      publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z',
      articleTags: [{ articleId: 5, tag: 'ideas' }],
    }], total: 1, page: 1, limit: 10 } })
  })
  await page.goto('/tags')
  await page.getByRole('link', { name: /#ideas.*1 ensayo/ }).click()
  await expect(page).toHaveURL(/\/articles\?tag=ideas$/)
  await expect(page.getByRole('heading', { name: 'Una idea compartida' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Etiquetas' }).getByRole('link', { name: '#ideas' })).toHaveAttribute('href', '/articles?tag=ideas')
})
