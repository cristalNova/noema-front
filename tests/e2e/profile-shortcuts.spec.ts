import { expect, test, type Page } from '@playwright/test'
import { mockBackgroundApis } from './support'

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }
const other = { id: 7, username: 'ana', name: 'Ana Pérez', bio: '', followersCount: 3, isVerified: false }

const SHORTCUTS: [string, RegExp][] = [
  ['Continuar leyendo', /\/app\/continue-reading$/],
  ['Mis favoritos', /\/app\/favorites$/],
  ['Mis marcadores', /\/app\/bookmarks$/],
  ['Mis listas', /\/app\/reading-lists$/],
  ['Mis colecciones', /\/app\/collections$/],
  ['Mis comunidades', /\/communities\/mine$/],
  ['Mis intereses', /\/onboarding\/interests$/],
  ['Mis planes', /\/app\/plans$/],
  ['Mis suscripciones', /\/app\/subscriptions$/],
  ['Historial de pagos', /\/app\/payments$/],
  ['Editar perfil', /\/app\/profile\/edit$/],
]

function tokenFor(permissions: string[]) {
  const payload = btoa(JSON.stringify({ sub: '8', email: 'e2e@example.test', roles: [], permissions, exp: Math.floor(Date.now() / 1000) + 3600 }))
  return `header.${payload}.signature`
}

async function setup(page: Page, permissions: string[] = []) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor(permissions))
  await mockBackgroundApis(page)
  await page.route(
    (url) => ['/profiles/me', '/profiles/8', '/profiles/7'].includes(url.pathname) || url.pathname.startsWith('/reading-lists/profile/') || url.pathname === '/articles',
    (route) => {
      const request = route.request()
      if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
      const { pathname } = new URL(request.url())
      if (pathname === '/articles') return route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } })
      if (pathname.startsWith('/reading-lists/')) return route.fulfill({ json: [] })
      return route.fulfill({ json: pathname === '/profiles/7' ? other : me })
    },
  )
}

test('el perfil propio reúne los accesos de la cuenta y cada uno lleva a su página', async ({ page }) => {
  await setup(page)
  for (const [name, url] of SHORTCUTS) {
    await page.goto('/profiles/8')
    const space = page.getByRole('region', { name: 'Mi espacio' })
    await expect(space.getByRole('link')).toHaveCount(SHORTCUTS.length)
    await space.getByRole('link', { name }).click()
    await expect(page).toHaveURL(url)
  }
})

test('«Administración» solo aparece con permisos de administración', async ({ page }) => {
  await setup(page)
  await page.goto('/profiles/8')
  await expect(page.getByRole('region', { name: 'Mi espacio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)

  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await setup(page, ['manage_users'])
  await page.goto('/profiles/8')
  await expect(page.getByRole('region', { name: 'Mi espacio' }).getByRole('link', { name: 'Administración' })).toBeVisible()
})

test('el perfil de otra persona no muestra «Mi espacio»', async ({ page }) => {
  await setup(page)
  await page.goto('/profiles/7')
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Mi espacio' })).toHaveCount(0)
})

test('el menú de la cuenta se limita a perfil, edición y cerrar sesión', async ({ page }) => {
  await setup(page)
  await page.goto('/profiles/7')
  await page.getByRole('button', { name: /^Cuenta de/ }).click()
  await expect(page.getByRole('menuitem')).toHaveText(['Mi perfil', 'Editar perfil', 'Cerrar sesión'])
})
