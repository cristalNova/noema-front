import { expect, test, type Page, type Route } from '@playwright/test'
import { mockBackgroundApis } from './support'

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }

function notification(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id, recipientId: 8, actorId: 7, actor: { id: 7, username: 'ana', name: `Ana ${id}` },
    type: 'FOLLOW', referenceType: 'PROFILE', referenceId: 7, isRead: false, createdAt: '2026-11-20T12:00:00.000Z', ...overrides,
  }
}

function tokenFor(userId = '8') {
  const payload = btoa(JSON.stringify({ sub: userId, email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  return `header.${payload}.signature`
}

async function mockApi(page: Page, matches: (url: URL) => boolean, handler: (route: Route, url: URL) => Promise<void> | void) {
  await page.route((url) => matches(url), async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    await handler(route, new URL(route.request().url()))
  })
}

/**
 * Simula el servidor: guarda las notificaciones, pagina de 20 en 20, borra con DELETE
 * y responde el conteo real de no leídas. Devuelve un registro de lo que recibió.
 */
async function setup(page: Page, initial: ReturnType<typeof notification>[], options: { failDelete?: boolean } = {}) {
  const server = { items: [...initial], deletes: [] as number[], countRequests: 0 }
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await mockBackgroundApis(page)
  await mockApi(page, (url) => url.pathname === '/profiles/me', (route) => route.fulfill({ json: me }))
  await mockApi(page, (url) => url.pathname === '/notifications/unread-count', (route) => {
    server.countRequests += 1
    return route.fulfill({ json: { unread: server.items.filter((item) => !item.isRead).length } })
  })
  await mockApi(page, (url) => url.pathname === '/notifications', (route, url) => {
    const current = Number(url.searchParams.get('page') ?? 1)
    const data = server.items.slice((current - 1) * 20, current * 20)
    return route.fulfill({ json: { data, total: server.items.length, page: current, limit: 20 } })
  })
  await mockApi(page, (url) => /^\/notifications\/\d+$/.test(url.pathname), (route, url) => {
    const id = Number(url.pathname.split('/').pop())
    server.deletes.push(id)
    if (options.failDelete) return route.fulfill({ status: 500, json: { statusCode: 500, message: 'Fallo del servidor' } })
    server.items = server.items.filter((item) => item.id !== id)
    return route.fulfill({ status: 204 })
  })
  await mockApi(page, (url) => url.pathname === '/articles', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } }))
  return server
}

const bell = (page: Page) => page.getByRole('navigation', { name: 'Sesión' }).getByRole('link', { name: /^Notificaciones/ })
const entry = (page: Page, name: string) => list(page).getByRole('link', { name: `${name} empezó a seguirte` })
const list = (page: Page) => page.getByRole('list', { name: 'Notificaciones' })
const deleteButton = (page: Page, name: string) => page.getByRole('button', { name: `Eliminar la notificación de ${name}` })

test('la campana oculta la insignia en cero y abrevia los conteos altos', async ({ page }) => {
  const server = await setup(page, [])
  await page.goto('/')
  await expect(bell(page)).toHaveAccessibleName('Notificaciones')
  await expect(bell(page).locator('.navbar__badge')).toHaveCount(0)

  server.items = Array.from({ length: 150 }, (_, index) => notification(index + 1))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 150 sin leer')
  await expect(bell(page).locator('.navbar__badge')).toHaveText('99+')
})

test('eliminar con teclado quita la notificación al instante, baja el contador y la borra al terminar el plazo', async ({ page }) => {
  await page.clock.install()
  const server = await setup(page, [notification(1), notification(2), notification(3, { isRead: true })])
  await page.goto('/app/notifications')
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')

  await deleteButton(page, 'Ana 1').focus()
  await page.keyboard.press('Enter')
  await expect(entry(page, 'Ana 1')).toHaveCount(0)
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer')
  await expect(page.getByRole('status').filter({ hasText: 'Notificación eliminada.' })).toBeVisible()
  await expect(page.locator('li.notification').first()).toBeFocused()
  expect(server.deletes).toEqual([])

  await page.clock.runFor(6000)
  await expect.poll(() => server.deletes).toEqual([1])
  await expect(page.getByText('Notificación eliminada.')).toHaveCount(0)
  await expect(list(page).locator('li')).toHaveCount(2)
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer')
})

test('deshacer devuelve la notificación y el contador, y no la borra', async ({ page }) => {
  await page.clock.install()
  const server = await setup(page, [notification(1), notification(2)])
  await page.goto('/app/notifications')
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')

  await deleteButton(page, 'Ana 1').click()
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer')
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(entry(page, 'Ana 1')).toBeVisible()
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')

  await page.clock.runFor(10_000)
  expect(server.deletes).toEqual([])
})

test('el conteo periódico no revierte el contador mientras se puede deshacer', async ({ page }) => {
  await page.clock.install()
  const server = await setup(page, [notification(1), notification(2), notification(3)])
  await page.goto('/app/notifications')
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 3 sin leer')

  await deleteButton(page, 'Ana 1').click()
  const before = server.countRequests
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(() => server.countRequests).toBeGreaterThan(before)
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')
})

test('eliminar una leída no cambia el contador', async ({ page }) => {
  await setup(page, [notification(1), notification(2, { isRead: true })])
  await page.goto('/app/notifications')
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer')
  await deleteButton(page, 'Ana 2').click()
  await expect(entry(page, 'Ana 2')).toHaveCount(0)
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer')
})

test('si el servidor falla, la notificación vuelve y se explica', async ({ page }) => {
  await page.clock.install()
  await setup(page, [notification(1), notification(2)], { failDelete: true })
  await page.goto('/app/notifications')

  await deleteButton(page, 'Ana 1').click()
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer')
  await page.clock.runFor(6000)
  await expect(page.getByRole('alert')).toContainText('No se pudo eliminar la notificación')
  await expect(entry(page, 'Ana 1')).toBeVisible()
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')
})

test('al vaciar una página se carga la anterior', async ({ page }) => {
  await setup(page, Array.from({ length: 21 }, (_, index) => notification(index + 1, { isRead: true })))
  await page.goto('/app/notifications?page=2')
  await expect(list(page).locator('li')).toHaveCount(1)

  await deleteButton(page, 'Ana 21').click()
  await expect(page).toHaveURL(/\/app\/notifications$/)
  await expect(list(page).locator('li')).toHaveCount(20)
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible()
})

test('al eliminar la última se muestra el estado vacío', async ({ page }) => {
  await setup(page, [notification(1)])
  await page.goto('/app/notifications')
  await deleteButton(page, 'Ana 1').click()
  await expect(page.getByRole('heading', { name: 'Todo al día.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeFocused()
  await expect(bell(page)).toHaveAccessibleName('Notificaciones')
})

test('salir de la pantalla durante el plazo no pierde la eliminación', async ({ page }) => {
  const server = await setup(page, [notification(1), notification(2)])
  await page.goto('/app/notifications')
  await deleteButton(page, 'Ana 1').click()
  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect.poll(() => server.deletes).toEqual([1])
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer')
})

test('marcar como leída y marcar todas bajan el contador de inmediato', async ({ page }) => {
  await setup(page, [notification(1), notification(2), notification(3)])
  await mockApi(page, (url) => /^\/notifications\/\d+\/read$/.test(url.pathname), (route) => route.fulfill({ json: {} }))
  await mockApi(page, (url) => url.pathname === '/notifications/read-all', (route) => route.fulfill({ json: { updated: 2 } }))
  await page.goto('/app/notifications')
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 3 sin leer')

  await page.getByRole('button', { name: 'Marcar como leída la notificación de Ana 1' }).click()
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 2 sin leer')
  await page.getByRole('button', { name: 'Marcar todas como leídas' }).click()
  await expect(bell(page)).toHaveAccessibleName('Notificaciones')
})
