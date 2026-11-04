import { expect, test, type Page } from '@playwright/test'

const author = { id: 7, username: 'ana', name: 'Ana Pérez', followersCount: 12, isVerified: false }
const mine = { id: 2, username: 'samuel', name: 'Samuel', followersCount: 0, isVerified: false }

function tokenFor(userId: number) {
  const payload = btoa(JSON.stringify({ sub: userId, email: 'reader@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  return `header.${payload}.signature`
}

async function mockPublicProfile(page: Page) {
  await page.route('**/profiles/7', (route) => {
    if (route.request().resourceType() === 'document') return route.fallback()
    return route.fulfill({ json: author })
  })
  await page.route('**/reading-lists/profile/7', (route) => route.fulfill({ json: [] }))
  await page.route((url) => url.pathname.endsWith('/articles') && url.searchParams.get('authorId') === '7',
    (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } }))
}

async function signIn(page: Page, profile = mine) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor(profile.id))
  await page.route('**/profiles/me', (route) => route.fulfill({ json: profile }))
  await page.route(`**/follows/following/${profile.id}`, (route) => route.fulfill({ json: [] }))
}

test('visitante puede pulsar Seguir y vuelve al perfil tras iniciar sesión', async ({ page }) => {
  await mockPublicProfile(page)
  await page.goto('/profiles/7')
  await page.getByRole('link', { name: 'Seguir', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible()
})

test('no aparece Seguir en mi propio perfil', async ({ page }) => {
  await signIn(page, author)
  await mockPublicProfile(page)
  await page.goto('/profiles/7')
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(page.getByText('12 seguidores')).toBeVisible()
  await expect(page.getByRole('button', { name: /Seguir|Siguiendo/ })).toHaveCount(0)
})

test('seguir y dejar de seguir actualiza botón y contador al instante', async ({ page }) => {
  await signIn(page)
  await mockPublicProfile(page)
  let finishFollow!: () => void
  const followPending = new Promise<void>((resolve) => { finishFollow = resolve })
  await page.route('**/follows/7', async (route) => {
    if (route.request().method() === 'POST') {
      await followPending
      return route.fulfill({ status: 201, json: { followerId: 2, followedId: 7 } })
    }
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto('/profiles/7')
  await page.getByRole('button', { name: 'Seguir', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Siguiendo' })).toBeVisible()
  await expect(page.getByText('13 seguidores')).toBeVisible()
  finishFollow()
  await expect(page.getByRole('button', { name: 'Siguiendo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Siguiendo' }).click()
  await expect(page.getByRole('button', { name: 'Seguir', exact: true })).toBeVisible()
  await expect(page.getByText('12 seguidores')).toBeVisible()
})

test('si el servidor rechaza seguir, revierte el botón y el contador y avisa', async ({ page }) => {
  await signIn(page)
  await mockPublicProfile(page)
  let reject!: () => void
  const pending = new Promise<void>((resolve) => { reject = resolve })
  await page.route('**/follows/7', async (route) => {
    await pending
    return route.fulfill({ status: 500, json: { message: 'Error de prueba' } })
  })
  await page.goto('/profiles/7')
  await page.getByRole('button', { name: 'Seguir', exact: true }).click()
  await expect(page.getByText('13 seguidores')).toBeVisible()
  reject()
  await expect(page.getByRole('alert')).toContainText('No se pudo actualizar')
  await expect(page.getByRole('button', { name: 'Seguir', exact: true })).toBeVisible()
  await expect(page.getByText('12 seguidores')).toBeVisible()
})

test('la tarjeta del autor en la biblioteca también permite seguir', async ({ page }) => {
  await signIn(page)
  // El catálogo consulta filtros en paralelo. Evita que un 401 del backend real
  // borre el token de esta sesión simulada y redirija la prueba al login.
  await page.route('**/article-tags', (route) => route.fulfill({ json: [] }))
  await page.route('**/profiles', (route) => route.fulfill({ json: [{ id: 7, name: 'Ana Pérez', username: 'ana' }] }))
  await page.route('**/collections', (route) => route.fulfill({ json: [] }))
  await page.route((url) => url.pathname.endsWith('/communities/mine'),
    (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  await page.route('**/profiles/7', (route) => route.fulfill({ json: author }))
  await page.route((url) => url.pathname.endsWith('/articles') && !url.searchParams.has('authorId'), (route) => {
    if (route.request().resourceType() === 'document') return route.fallback()
    return route.fulfill({ json: { data: [{
      id: 42, authorId: 7, title: 'Una idea compartida', description: 'Lectura breve', status: 'PUBLISHED',
      isPremium: false, communityId: null, publishedAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
    }], total: 1, page: 1, limit: 10 } })
  })
  await page.route('**/follows/7', (route) => route.fulfill({ status: 201, json: { followerId: 2, followedId: 7 } }))
  await page.goto('/articles')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Una idea compartida' }) })
  await expect(card.getByRole('link', { name: /Ana Pérez/ })).toHaveAttribute('href', '/profiles/7')
  await card.getByRole('button', { name: 'Seguir', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Siguiendo' })).toBeVisible()
  await expect(card.getByText('13 seguidores')).toBeVisible()
})
