import { expect, test, type Page } from '@playwright/test'

const community = {
  id: 1,
  ownerId: 7,
  owner: {
    id: 7,
    name: 'María López',
    profilePhoto: null,
  },
  name: 'Club de lectura contemporánea',
  topic: 'Literatura',
  description: 'Lecturas y conversaciones.',
  isPremium: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  tags: [{ communityId: 1, tag: 'novela', community: null }],
  membersCount: 12,
}

const pageOf = (data: unknown[], total = data.length) => ({
  data,
  total,
  page: 1,
  limit: 20,
})

function tokenFor(userId = '7') {
  const payload = btoa(JSON.stringify({
    sub: userId,
    email: 'e2e@example.test',
    roles: [],
    permissions: [],
    exp: Math.floor(Date.now() / 1000) + 3600,
  }))
  return `header.${payload}.signature`
}

async function mockCommunityApi(page: Page) {
  await page.route('**/communities**', async (route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) {
      await route.fallback()
      return
    }
    const url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname === '/communities') {
      await route.fulfill({ json: pageOf([community, { ...community, id: 2, name: 'Ciencia y sociedad', isPremium: true }], 2) })
      return
    }
    if (request.method() === 'GET' && url.pathname === '/communities/1') {
      await route.fulfill({ json: community })
      return
    }
    await route.fallback()
  })
  await page.route('**/articles**', async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) {
      await route.fallback()
      return
    }
    await route.fulfill({ json: pageOf([]) })
  })
  await page.route('**/posts**', async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) {
      await route.fallback()
      return
    }
    await route.fulfill({ json: pageOf([]) })
  })
}

test('visitor can explore communities and open a detail page', async ({ page }) => {
  await mockCommunityApi(page)
  await page.goto('/communities')

  await expect(page.getByRole('heading', { name: 'Explora comunidades' })).toBeVisible()
  await expect(page.getByText('Club de lectura contemporánea')).toBeVisible()
  await expect(page.getByText('Premium')).toBeVisible()
  await page.getByRole('link', { name: 'Ver comunidad' }).first().click()
  await expect(page.getByRole('heading', { name: community.name })).toBeVisible()
  await page.getByRole('button', { name: 'Inicia sesión para unirte' }).click()
  const authPrompt = page.getByRole('dialog', { name: 'Inicia sesión para continuar' })
  await expect(authPrompt.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
  await authPrompt.getByRole('button', { name: 'Ahora no' }).click()
  await page.getByRole('tab', { name: 'Publicaciones' }).click()
  await expect(page.getByText('No hay publicaciones en esta comunidad.')).toBeVisible()
})

test('visitor is redirected before opening the protected creation form', async ({ page }) => {
  await page.goto('/communities/new')
  await expect(page).toHaveURL(/\/login$/)
})

test('authenticated user can validate the creation form without losing values', async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await page.route('**/profiles/me', async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) {
      await route.fallback()
      return
    }
    await route.fulfill({ json: { id: 7, username: 'maria', name: 'María López' } })
  })
  await mockCommunityApi(page)
  await page.goto('/communities/new')

  await page.getByLabel('Nombre de la comunidad').fill('Mi comunidad')
  await page.getByRole('button', { name: 'Crear comunidad' }).click()
  await expect(page.getByLabel('Nombre de la comunidad')).toHaveValue('Mi comunidad')
  await expect(page.getByText('La temática es obligatoria')).toBeVisible()
})

test('authenticated user can join and leave an open community', async ({ page }) => {
  let membership: 'ACTIVE' | null = null
  let joinRequests = 0
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor('9'))
  await page.route('**/profiles/me', async (route) => {
    await route.fulfill({ json: { id: 9, username: 'ana', name: 'Ana Gómez' } })
  })
  await mockCommunityApi(page)
  await page.route('**/communities/1/members**', async (route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) {
      await route.fallback()
      return
    }
    if (request.method() === 'GET') {
      await route.fulfill({ json: pageOf(membership ? [{
        profileId: 9,
        communityId: 1,
        role: 'MEMBER',
        status: membership,
        joinedAt: '2026-01-01T00:00:00.000Z',
      }] : []) })
      return
    }
    if (request.method() === 'POST') {
      joinRequests += 1
      membership = 'ACTIVE'
      await route.fulfill({ status: 201, json: {
        profileId: 9,
        communityId: 1,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: '2026-01-01T00:00:00.000Z',
      } })
      return
    }
    membership = null
    await route.fulfill({ status: 204 })
  })
  await page.goto('/communities/1')
  await page.getByRole('button', { name: 'Unirme' }).click()
  await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible()
  expect(joinRequests).toBe(1)

  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('button', { name: 'Unirme' })).toBeVisible()
})
