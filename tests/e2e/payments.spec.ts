import { expect, test, type Page, type Route } from '@playwright/test'
import { mockBackgroundApis } from './support'

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }

const club = { id: 9, authorId: null, communityId: 3, name: 'Club mensual', price: 5, currency: 'USD', billingPeriod: 'MONTHLY', isActive: true }
const reader = { id: 10, authorId: 7, communityId: null, name: 'Lector anual', price: 48000, currency: 'COP', billingPeriod: 'YEARLY', isActive: true }
const subscriptions = [
  { id: 1, planId: 9, plan: club, status: 'ACTIVE', startDate: '2026-11-03T12:00:00.000Z', endDate: '2026-12-03T12:00:00.000Z' },
  { id: 2, planId: 10, plan: reader, status: 'EXPIRED', startDate: '2025-01-10T12:00:00.000Z', endDate: '2026-01-10T12:00:00.000Z' },
]

function payment(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id, subscriptionId: 1, profileId: 8, amount: 5, currency: 'USD', paymentMethod: 'CARD', status: 'PAID',
    externalReference: `SIM-${id}`, paidAt: '2026-11-03T15:30:00.000Z', ...overrides,
  }
}

const history = [
  payment(3, { paymentMethod: 'PAYPAL' }),
  payment(2, { status: 'FAILED', paidAt: null, paymentMethod: 'BANK_TRANSFER', externalReference: 'SIM-fallo' }),
  payment(1, { subscriptionId: 2, amount: 48000, currency: 'COP', status: 'REFUNDED', paidAt: '2025-01-10T12:00:00.000Z' }),
]

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

/** Simula GET /payments con paginación de 20 y el filtro subscriptionId. */
async function setup(page: Page, payments: ReturnType<typeof payment>[] = history) {
  const seen: URL[] = []
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await mockBackgroundApis(page)
  await mockApi(page, (url) => url.pathname === '/profiles/me', (route) => route.fulfill({ json: me }))
  await mockApi(page, (url) => url.pathname === '/subscriptions', (route) => route.fulfill({ json: { data: subscriptions, total: 2, page: 1, limit: 100 } }))
  await mockApi(page, (url) => url.pathname === '/payments', (route, url) => {
    seen.push(url)
    const current = Number(url.searchParams.get('page') ?? 1)
    const filter = Number(url.searchParams.get('subscriptionId')) || null
    const matching = filter ? payments.filter((item) => item.subscriptionId === filter) : payments
    return route.fulfill({ json: { data: matching.slice((current - 1) * 20, current * 20), total: matching.length, page: current, limit: 20 } })
  })
  await mockApi(page, (url) => /^\/payments\/\d+$/.test(url.pathname), (route, url) => {
    const id = Number(url.pathname.split('/').pop())
    if (id === 99) return route.fulfill({ status: 403, json: { statusCode: 403, message: 'Este pago pertenece a otro perfil' } })
    const found = payments.find((item) => item.id === id)
    return found ? route.fulfill({ json: found }) : route.fulfill({ status: 404, json: { statusCode: 404, message: 'Pago no encontrado' } })
  })
  await mockApi(page, (url) => url.pathname === '/articles', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } }))
  return seen
}

const rows = (page: Page) => page.getByRole('list', { name: 'Pagos' }).getByRole('listitem')

test('el historial exige sesión', async ({ page }) => {
  await page.goto('/app/payments')
  await expect(page).toHaveURL(/\/login$/)
})

test('se llega desde el menú y lista monto, moneda, método, fecha y estado de cada pago', async ({ page }) => {
  await setup(page)
  await page.goto('/')
  await page.getByRole('button', { name: /^Cuenta de/ }).click()
  await page.getByRole('menuitem', { name: 'Historial de pagos' }).click()
  await expect(page).toHaveURL(/\/app\/payments$/)

  await expect(rows(page)).toHaveCount(3)
  const paid = rows(page).nth(0)
  await expect(paid).toContainText('5,00 USD')
  await expect(paid).toContainText('Club mensual')
  await expect(paid).toContainText('PayPal')
  await expect(paid).toContainText('3 de noviembre de 2026')
  await expect(paid).toContainText('Pagado')

  const failed = rows(page).nth(1)
  await expect(failed).toContainText('Fallido')
  await expect(failed).toContainText('Transferencia bancaria')
  await expect(failed).toContainText('Sin cobro')

  const refunded = rows(page).nth(2)
  await expect(refunded).toContainText('48.000,00 COP')
  await expect(refunded).toContainText('Lector anual')
  await expect(refunded).toContainText('Reembolsado')
})

test('pagina de 20 en 20 y conserva la página en la URL', async ({ page }) => {
  const many = Array.from({ length: 25 }, (_, index) => payment(index + 1, { amount: index + 1 }))
  const seen = await setup(page, many)
  await page.goto('/app/payments')
  await expect(rows(page)).toHaveCount(20)
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(rows(page)).toHaveCount(5)
  expect(seen.at(-1)?.searchParams.get('page')).toBe('2')
})

test('filtra por suscripción, vuelve a la primera página y se puede quitar el filtro', async ({ page }) => {
  const many = [...Array.from({ length: 21 }, (_, index) => payment(index + 10)), payment(1, { subscriptionId: 2, amount: 48000, currency: 'COP' })]
  const seen = await setup(page, many)
  await page.goto('/app/payments?page=2')

  const filter = page.getByLabel('Suscripción')
  await filter.selectOption({ label: 'Lector anual' })
  await expect(page).toHaveURL(/\/app\/payments\?subscription=2$/)
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first()).toContainText('48.000,00 COP')
  expect(seen.at(-1)?.searchParams.get('subscriptionId')).toBe('2')
  expect(seen.at(-1)?.searchParams.get('page')).toBe('1')

  await filter.selectOption({ label: 'Todas las suscripciones' })
  await expect(page).toHaveURL(/\/app\/payments$/)
  await expect(rows(page)).toHaveCount(20)
})

test('desde "Mis suscripciones" se llega a los pagos de una suscripción ya filtrados', async ({ page }) => {
  await setup(page)
  await page.goto('/app/subscriptions')
  await page.locator('#subscription-2').getByRole('link', { name: 'Ver pagos' }).click()
  await expect(page).toHaveURL(/\/app\/payments\?subscription=2$/)
  await expect(page.getByLabel('Suscripción')).toHaveValue('2')
  await expect(rows(page)).toHaveCount(1)
})

test('un filtro sin pagos ofrece ver todos', async ({ page }) => {
  await setup(page, [payment(3)])
  await page.goto('/app/payments?subscription=2')
  await expect(page.getByRole('heading', { name: 'Esta suscripción no tiene pagos.' })).toBeVisible()
  await page.getByRole('button', { name: 'Ver todos los pagos' }).click()
  await expect(rows(page)).toHaveCount(1)
})

test('sin pagos se muestra el estado vacío con enlace a los planes', async ({ page }) => {
  await setup(page, [])
  await page.goto('/app/payments')
  await expect(page.getByRole('heading', { name: 'Aún no has hecho pagos.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver planes disponibles' })).toHaveAttribute('href', '/communities')
})

test('el detalle muestra todo el pago, incluida la referencia externa', async ({ page }) => {
  await setup(page)
  await page.goto('/app/payments')
  await page.getByRole('link', { name: 'Ver detalle del pago de 5,00 USD por Club mensual' }).first().click()
  await expect(page).toHaveURL(/\/app\/payments\/3$/)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('5,00 USD')
  await expect(page.getByText('Pago #3')).toBeVisible()
  await expect(page.getByText('El cobro se aprobó.')).toBeVisible()
  const facts = page.locator('.payment-detail__facts')
  await expect(facts).toContainText('MonedaUSD')
  await expect(facts).toContainText('Método de pagoPayPal')
  await expect(facts).toContainText('3 de noviembre de 2026')
  await expect(facts).toContainText('Club mensual · facturación mensual')
  await expect(facts.getByText('SIM-3', { exact: true })).toBeVisible()
  await facts.getByRole('link', { name: 'Ver sus pagos' }).click()
  await expect(page).toHaveURL(/\/app\/payments\?subscription=1$/)
})

test('un pago fallido explica que no se cobró', async ({ page }) => {
  await setup(page)
  await page.goto('/app/payments/2')
  await expect(page.getByText('Fallido', { exact: true })).toBeVisible()
  await expect(page.getByText('no se te cobró y la suscripción no se extendió')).toBeVisible()
  await expect(page.locator('.payment-detail__facts')).toContainText('Fecha de cobroSin cobro')
})

test('un pago ajeno o inexistente se informa con claridad', async ({ page }) => {
  await setup(page)
  await page.goto('/app/payments/99')
  await expect(page.getByRole('heading', { name: 'No puedes ver este pago' })).toBeVisible()
  await page.goto('/app/payments/50')
  await expect(page.getByRole('heading', { name: 'Pago no encontrado' })).toBeVisible()
})

test('un fallo al cargar el historial permite reintentar', async ({ page }) => {
  let shouldFail = true
  await setup(page)
  await mockApi(page, (url) => url.pathname === '/payments', (route) => shouldFail
    ? route.fulfill({ status: 500, json: { statusCode: 500, message: 'Fallo del servidor' } })
    : route.fulfill({ json: { data: [payment(3)], total: 1, page: 1, limit: 20 } }))
  await page.goto('/app/payments')
  await expect(page.getByRole('alert')).toContainText('Fallo del servidor')
  shouldFail = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(rows(page)).toHaveCount(1)
})
