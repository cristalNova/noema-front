import { expect, test } from '@playwright/test'

test('el ensayo permite abrir el perfil aunque la API omita el objeto author', async ({ page }) => {
  await page.route('**/articles/42', (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return route.fulfill({ json: {
      id: 42, authorId: 7, title: 'Una idea compartida', description: 'Lectura breve', content: 'Contenido',
      status: 'PUBLISHED', isPremium: false, communityId: null, publishedAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
    } })
  })
  await page.route('**/profiles/7', (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return route.fulfill({ json: { id: 7, username: 'ana', name: 'Ana Pérez', isVerified: false, followersCount: 2 } })
  })
  await page.route('**/reading-lists/profile/7', (route) => route.fulfill({ json: [] }))
  await page.route((url) => url.pathname.endsWith('/articles') && url.searchParams.get('authorId') === '7', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } }))

  await page.goto('/articles/42')
  const author = page.getByRole('link', { name: 'Ana Pérez' })
  await expect(author).toHaveAttribute('href', '/profiles/7')
  await author.click()
  await expect(page).toHaveURL(/\/profiles\/7$/)
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
})
