import { expect, test } from '@playwright/test'

const profile = { id: 7, username: 'ana', name: 'Ana Pérez', profilePhoto: 'https://example.test/ana.png', bio: 'Escritora de ciencia ficción.', website: 'https://example.test', socialLinks: { Instagram: 'https://instagram.com/ana' }, followersCount: 12, isVerified: false }

test('muestra datos públicos, ensayos paginados y solo listas públicas', async ({ page }) => {
  await page.route('**/profiles/7', (route) => {
  if (!['xhr', 'fetch'].includes(route.request().resourceType()))
    return route.fallback()
  return route.fulfill({ json: profile })
})
  await page.route('**/reading-lists/profile/7', (route) => route.fulfill({ json: [
    { id: 1, profileId: 7, name: 'Lecturas favoritas', visibility: 'PUBLIC' },
    { id: 2, profileId: 7, name: 'Diario privado', visibility: 'PRIVATE' },
  ] }))
  await page.route((url) => url.pathname.endsWith('/articles') && url.searchParams.get('authorId') === '7', (route) => {
    const next = route.request().url().includes('page=2')
    return route.fulfill({ json: { data: [{ id: next ? 2 : 1, authorId: 7, title: next ? 'Segundo ensayo' : 'Primer ensayo', description: '', content: '', status: 'PUBLISHED', communityId: null, publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', isPremium: false, articleTags: [] }], total: 11, page: next ? 2 : 1, limit: 10 } })
  })
  await page.goto('/profiles/7')
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(page.getByText('@ana')).toBeVisible()
  await expect(page.getByText('12 seguidores')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sitio web' })).toHaveAttribute('href', 'https://example.test/')
  await expect(page.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', 'https://instagram.com/ana')
  await expect(page.getByRole('heading', { name: 'Primer ensayo' })).toBeVisible()
  await expect(page.getByText('Lecturas favoritas')).toBeVisible()
  await expect(page.getByText('Diario privado')).toHaveCount(0)
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('heading', { name: 'Segundo ensayo' })).toBeVisible()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
})

test('perfil inexistente tiene una página propia', async ({ page }) => {
  await page.route('**/profiles/99999', (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType()))
      return route.fallback()

    return route.fulfill({
      status: 404,
      json: { message: 'Perfil no encontrado' },
    })
  })

  await page.goto('/profiles/99999')
  await expect(page.getByRole('heading', { name: 'Perfil no encontrado' })).toBeVisible()
})
