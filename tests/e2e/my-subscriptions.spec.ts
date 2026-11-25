import { expect, test, type Page, type Route } from '@playwright/test'
import { mockBackgroundApis, openAccountShortcut } from './support'

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }

const monthly = { id: 9, authorId: null, communityId: 3, name: 'Club mensual', price: 5, currency: 'USD', billingPeriod: 'MONTHLY', isActive: true }
const yearly = { id: 10, authorId: 7, communityId: null, name: 'Lector anual', price: 48000, currency: 'COP', billingPeriod: 'YEARLY', isActive: true }
const retired = { id: 11, authorId: 7, communityId: null, name: 'Plan retirado', price: 3, currency: 'EUR', billingPeriod: 'MONTHLY', isActive: false }

const active = { id: 1, planId: 9, plan: monthly, status: 'ACTIVE', startDate: '2026-11-03T12:00:00.000Z', endDate: '2026-12-03T12:00:00.000Z', autoRenew: false }
const cancelled = { id: 2, planId: 10, plan: yearly, status: 'CANCELLED', startDate: '2026-06-01T12:00:00.000Z', endDate: '2099-06-01T12:00:00.000Z', autoRenew: false }
const expired = { id: 3, planId: 10, plan: yearly, status: 'EXPIRED', startDate: '2025-01-10T12:00:00.000Z', endDate: '2026-01-10T12:00:00.000Z', autoRenew: false }
const expiredRetired = { id: 4, planId: 11, plan: retired, status: 'EXPIRED', startDate: '2025-02-01T12:00:00.000Z', endDate: '2025-03-01T12:00:00.000Z', autoRenew: false }

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

async function setup(page: Page, subscriptions: unknown[] = [active, cancelled, expired, expiredRetired]) {
  const calls: { path: string; body: unknown }[] = []
  let listRequests = 0
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await mockBackgroundApis(page)
  await mockApi(page, (url) => url.pathname === '/profiles/me', (route) => route.fulfill({ json: me }))
  await mockApi(page, (url) => url.pathname === '/subscriptions', (route) => {
    listRequests += 1
    return route.fulfill({ json: { data: subscriptions, total: subscriptions.length, page: 1, limit: 100 } })
  })
  await mockApi(page, (url) => url.pathname === '/articles', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } }))
  return { calls, listRequests: () => listRequests }
}

const row = (page: Page, name: string) => page.getByRole('list', { name: 'Mis suscripciones' }).getByRole('listitem').filter({ hasText: name })

test('"Mis suscripciones" exige sesión', async ({ page }) => {
  await page.goto('/app/subscriptions')
  await expect(page).toHaveURL(/\/login$/)
})

test('se llega desde «Mi espacio» y lista plan, estado y fechas, con las acciones que corresponden', async ({ page }) => {
  await setup(page)
  await page.goto('/')
  await openAccountShortcut(page, me, 'Mis suscripciones')
  await expect(page).toHaveURL(/\/app\/subscriptions$/)

  const activeRow = row(page, 'Club mensual')
  await expect(activeRow).toContainText('Activa')
  await expect(activeRow).toContainText('5,00 USD / mes')
  await expect(activeRow).toContainText('Inicio3 de noviembre de 2026')
  await expect(activeRow).toContainText('Fin3 de diciembre de 2026')
  await expect(activeRow.getByRole('link', { name: 'Ver comunidad' })).toHaveAttribute('href', '/communities/3')
  await expect(activeRow.getByRole('button', { name: 'Renovar “Club mensual”' })).toBeVisible()
  await expect(activeRow.getByRole('button', { name: 'Cancelar “Club mensual”' })).toBeVisible()

  const cancelledRow = row(page, 'Lector anual').filter({ hasText: 'Cancelada' })
  await expect(cancelledRow).toContainText('No se renovará. Tienes acceso hasta el 1 de junio de 2099.')
  await expect(cancelledRow.getByRole('button')).toHaveCount(0)

  const expiredRow = row(page, 'Lector anual').filter({ hasText: 'Vencida' })
  await expect(expiredRow).toContainText('Venció el 10 de enero de 2026')
  await expect(expiredRow.getByRole('button', { name: 'Renovar “Lector anual”' })).toBeVisible()
  await expect(expiredRow.getByRole('button', { name: /^Cancelar/ })).toHaveCount(0)

  const retiredRow = row(page, 'Plan retirado')
  await expect(retiredRow).toContainText('El plan fue retirado: ya no se puede renovar.')
  await expect(retiredRow.getByRole('button')).toHaveCount(0)
})

test('sin suscripciones se invita a explorar', async ({ page }) => {
  await setup(page, [])
  await page.goto('/app/subscriptions')
  await expect(page.getByRole('heading', { name: 'Aún no tienes suscripciones.' })).toBeVisible()
})

test('renovar pide el método de pago y actualiza la fila sin recargar', async ({ page }) => {
  const bodies: unknown[] = []
  const server = await setup(page)
  await mockApi(page, (url) => url.pathname === '/subscriptions/3/renew', (route) => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ json: { ...expired, status: 'ACTIVE', startDate: '2026-11-23T12:00:00.000Z', endDate: '2027-11-23T12:00:00.000Z' } })
  })
  await page.goto('/app/subscriptions')

  const expiredRow = row(page, 'Lector anual').filter({ hasText: 'Vencida' })
  await expiredRow.getByRole('button', { name: 'Renovar “Lector anual”' }).click()
  const dialog = page.getByRole('dialog', { name: 'Renovar suscripción' })
  await expect(dialog).toContainText('48.000,00 COP / año')
  await expect(dialog).toContainText('se extenderá un año desde hoy')
  await dialog.getByRole('button', { name: 'Volver' }).click()
  await expect(dialog).toBeHidden()
  expect(bodies).toEqual([])

  await expiredRow.getByRole('button', { name: 'Renovar “Lector anual”' }).click()
  await dialog.getByLabel('Medio de pago').selectOption('PAYPAL')
  await dialog.getByRole('button', { name: 'Renovar y pagar' }).click()
  await expect(dialog).toBeHidden()

  const renewed = page.locator('#subscription-3')
  await expect(renewed).toContainText('Activa')
  await expect(renewed).toContainText('Fin23 de noviembre de 2027')
  await expect(renewed.getByRole('button', { name: 'Cancelar “Lector anual”' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Renovaste “Lector anual”.' })).toBeVisible()
  expect(bodies).toEqual([{ paymentMethod: 'PAYPAL' }])
  expect(server.listRequests()).toBe(1)
})

test('renovar una activa avisa que se extiende desde su fecha de fin', async ({ page }) => {
  await setup(page)
  await page.goto('/app/subscriptions')
  await row(page, 'Club mensual').getByRole('button', { name: 'Renovar “Club mensual”' }).click()
  await expect(page.getByRole('dialog')).toContainText('se extenderá un mes desde el 3 de diciembre de 2026')
})

test('un pago rechazado se explica, conserva el método y no cambia la fila', async ({ page }) => {
  let attempts = 0
  await setup(page)
  await mockApi(page, (url) => url.pathname === '/subscriptions/1/renew', (route) => {
    attempts += 1
    return route.fulfill({ status: 402, json: { statusCode: 402, message: 'Fondos insuficientes' } })
  })
  await page.goto('/app/subscriptions')

  await row(page, 'Club mensual').getByRole('button', { name: 'Renovar “Club mensual”' }).click()
  const dialog = page.getByRole('dialog', { name: 'Renovar suscripción' })
  await dialog.getByLabel('Medio de pago').selectOption('BANK_TRANSFER')
  await dialog.getByRole('button', { name: 'Renovar y pagar' }).dblclick()
  await expect(dialog.getByRole('alert')).toHaveText('Fondos insuficientes')
  await expect(dialog.getByLabel('Medio de pago')).toHaveValue('BANK_TRANSFER')
  await dialog.getByRole('button', { name: 'Volver' }).click()
  await expect(row(page, 'Club mensual')).toContainText('Fin3 de diciembre de 2026')
  expect(attempts).toBe(1)
})

test('cancelar pide confirmación, avisa hasta cuándo hay acceso y actualiza la fila', async ({ page }) => {
  let cancels = 0
  await setup(page)
  await mockApi(page, (url) => url.pathname === '/subscriptions/1/cancel', (route) => {
    cancels += 1
    return route.fulfill({ json: { ...active, status: 'CANCELLED' } })
  })
  await page.goto('/app/subscriptions')

  const activeRow = row(page, 'Club mensual')
  await activeRow.getByRole('button', { name: 'Cancelar “Club mensual”' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Cancelar suscripción?' })
  await expect(dialog).toContainText('Conservarás el acceso hasta el 3 de diciembre de 2026')
  await dialog.getByRole('button', { name: 'Mantener suscripción' }).click()
  await expect(dialog).toBeHidden()
  expect(cancels).toBe(0)

  await activeRow.getByRole('button', { name: 'Cancelar “Club mensual”' }).click()
  await dialog.getByRole('button', { name: 'Cancelar suscripción' }).click()
  await expect(dialog).toBeHidden()
  await expect(activeRow).toContainText('Cancelada')
  await expect(activeRow).toContainText('No se renovará. Tienes acceso hasta el 3 de diciembre de 2026.')
  await expect(activeRow.getByRole('button')).toHaveCount(0)
  await expect(page.locator('#subscription-1')).toBeFocused()
  expect(cancels).toBe(1)
})

test('si cancelar falla se explica y la suscripción sigue activa', async ({ page }) => {
  await setup(page)
  await mockApi(page, (url) => url.pathname === '/subscriptions/1/cancel', (route) => route.fulfill({ status: 400, json: { statusCode: 400, message: 'Solo se puede cancelar una suscripción activa' } }))
  await page.goto('/app/subscriptions')

  await row(page, 'Club mensual').getByRole('button', { name: 'Cancelar “Club mensual”' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Cancelar suscripción?' })
  await dialog.getByRole('button', { name: 'Cancelar suscripción' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Solo se puede cancelar una suscripción activa')
  await dialog.getByRole('button', { name: 'Mantener suscripción' }).click()
  await expect(row(page, 'Club mensual')).toContainText('Activa')
})
