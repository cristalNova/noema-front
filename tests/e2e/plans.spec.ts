import { expect, test, type Page, type Route } from '@playwright/test'

const monthly = { id: 9, authorId: null, communityId: 1, name: 'Acceso mensual', price: 5, currency: 'USD', billingPeriod: 'MONTHLY', isActive: true }
const yearly = { id: 10, authorId: null, communityId: 1, name: 'Acceso anual', price: 480000, currency: 'COP', billingPeriod: 'YEARLY', isActive: true }
const authorPlan = { id: 11, authorId: 7, communityId: null, name: 'Lector fiel', price: 3.5, currency: 'EUR', billingPeriod: 'MONTHLY', isActive: true }
const author = { id: 7, userId: 70, username: 'maria', name: 'María López', bio: 'Escribo sobre lo cotidiano.', isVerified: false, followersCount: 3, createdAt: '2026-01-01T00:00:00.000Z' }
const community = { id: 1, ownerId: 7, owner: author, name: 'Club de ciencia', topic: 'Ciencia', description: 'Lecturas.', isPremium: true, createdAt: '2026-01-01T00:00:00.000Z', tags: [], memberCount: 2 }

const pageOf = (data: unknown[]) => ({ data, total: data.length, page: 1, limit: 100 })

function tokenFor(userId = '8') {
  const payload = btoa(JSON.stringify({ sub: userId, email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  return `header.${payload}.signature`
}

/** Deja pasar módulos y documentos de Vite: solo responde a las peticiones reales de la API. */
async function mockApi(page: Page, path: string, handler: (route: Route, url: URL) => Promise<void> | void) {
  await page.route(path, async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    await handler(route, new URL(route.request().url()))
  })
}

async function mockCatalog(page: Page, plans: unknown[] = [monthly, yearly]) {
  const seen: URL[] = []
  await mockApi(page, '**/plans?**', (route, url) => {
    seen.push(url)
    return route.fulfill({ json: pageOf(plans) })
  })
  await mockApi(page, '**/communities/1', (route) => route.fulfill({ json: community }))
  await mockApi(page, '**/profiles/7', (route) => route.fulfill({ json: author }))
  return seen
}

async function signIn(page: Page, hasProfile = true) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await mockProfile(page, hasProfile)
}

async function mockProfile(page: Page, hasProfile = true) {
  await mockApi(page, '**/profiles/me', (route) => hasProfile
    ? route.fulfill({ json: { ...author, id: 8, userId: 8, username: 'lector', name: 'Lector' } })
    : route.fulfill({ status: 404, json: { statusCode: 404, message: 'Perfil no encontrado' } }))
}

test('muestra nombre, precio, moneda y periodo de cada plan y oculta los inactivos', async ({ page }) => {
  const seen = await mockCatalog(page, [monthly, yearly, { ...monthly, id: 12, name: 'Plan retirado', isActive: false }])
  await page.goto('/communities/1/plans')

  await expect(page.getByRole('heading', { name: 'Planes de Club de ciencia' })).toBeVisible()
  const plans = page.getByRole('list', { name: 'Planes de pago' }).getByRole('listitem')
  await expect(plans).toHaveCount(2)
  await expect(plans.filter({ hasText: 'Acceso mensual' })).toContainText('5,00')
  await expect(plans.filter({ hasText: 'Acceso mensual' })).toContainText('USD / mes')
  await expect(plans.filter({ hasText: 'Acceso mensual' })).toContainText('Facturación mensual')
  await expect(plans.filter({ hasText: 'Acceso anual' })).toContainText('COP / año')
  await expect(plans.filter({ hasText: 'Acceso anual' })).toContainText('Facturación anual')
  await expect(page.getByText('Plan retirado')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Suscribirme/ })).toHaveCount(2)
  expect(seen.at(-1)?.searchParams.get('communityId')).toBe('1')
})

test('se llega a los planes desde la comunidad premium', async ({ page }) => {
  await mockCatalog(page)
  await mockApi(page, '**/articles**', (route) => route.fulfill({ json: pageOf([]) }))
  await page.goto('/communities/1')
  await page.getByRole('link', { name: 'Ver planes' }).click()
  await expect(page).toHaveURL(/\/communities\/1\/plans$/)
  await expect(page.getByRole('heading', { name: 'Planes de Club de ciencia' })).toBeVisible()
})

test('una comunidad gratuita no ofrece el acceso a planes', async ({ page }) => {
  await mockCatalog(page)
  await mockApi(page, '**/communities/1', (route) => route.fulfill({ json: { ...community, isPremium: false } }))
  await mockApi(page, '**/articles**', (route) => route.fulfill({ json: pageOf([]) }))
  await page.goto('/communities/1')
  await expect(page.getByRole('heading', { name: community.name })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver planes' })).toHaveCount(0)
})

test('se llega a los planes desde el perfil del autor', async ({ page }) => {
  const seen = await mockCatalog(page, [authorPlan])
  await page.goto('/profiles/7')
  await expect(page.getByRole('heading', { name: author.name })).toBeVisible()
  await expect(page.getByText(author.bio)).toBeVisible()
  await page.getByRole('link', { name: 'Ver planes' }).click()
  await expect(page).toHaveURL(/\/profiles\/7\/plans$/)
  await expect(page.getByRole('heading', { name: 'Lector fiel' })).toBeVisible()
  expect(seen.at(-1)?.searchParams.get('authorId')).toBe('7')
})

test('se llega a los planes del autor desde el bloqueo de un ensayo premium', async ({ page }) => {
  await mockCatalog(page, [authorPlan])
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: {
    id: 5, authorId: 7, title: 'Ensayo premium', description: '', content: 'Solo un adelanto.', isPremium: true, locked: true,
    status: 'PUBLISHED', communityId: null, publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
  } }))
  await page.goto('/articles/5')
  await page.getByRole('link', { name: 'Suscribirme', exact: true }).click()
  await expect(page).toHaveURL(/\/profiles\/7\/plans\?essay=5$/)
  await expect(page.getByRole('heading', { name: 'Planes de María López' })).toBeVisible()
})

test('sin sesión lleva a iniciar sesión y vuelve a la confirmación del plan elegido', async ({ page }) => {
  await mockCatalog(page)
  await mockProfile(page)
  await mockApi(page, '**/auth/login', (route) => route.fulfill({ json: { access_token: tokenFor(), token_type: 'Bearer' } }))
  await page.goto('/communities/1/plans')

  await page.getByRole('button', { name: 'Suscribirme a Acceso anual' }).click()
  const authPrompt = page.getByRole('dialog', { name: 'Inicia sesión para continuar' })
  await expect(authPrompt).toContainText('suscribirte a este plan')
  await authPrompt.getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Correo electrónico').fill('e2e@example.test')
  await page.getByLabel('Contraseña').fill('una-clave-de-prueba')
  await page.getByRole('main').getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page).toHaveURL(/\/communities\/1\/plans\?plan=10$/)
  await expect(page.getByRole('dialog', { name: 'Confirma tu suscripción' })).toContainText('Acceso anual')
})

test('con sesión no cobra hasta confirmar y envía el medio de pago elegido', async ({ page }) => {
  const bodies: Record<string, unknown>[] = []
  await signIn(page)
  await mockCatalog(page)
  await mockApi(page, '**/subscriptions', (route) => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { id: 1, planId: 9, plan: monthly, status: 'ACTIVE' } })
  })
  await page.goto('/communities/1/plans')

  const subscribe = page.getByRole('button', { name: 'Suscribirme a Acceso mensual' })
  const dialog = page.getByRole('dialog', { name: 'Confirma tu suscripción' })
  await subscribe.click()
  await expect(dialog).toContainText('5,00 USD / mes')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/plans$/)
  expect(bodies).toEqual([])

  await subscribe.click()
  await dialog.getByLabel('Medio de pago').selectOption('PAYPAL')
  await dialog.getByRole('button', { name: 'Confirmar y pagar' }).click()
  await expect(page.getByRole('status')).toContainText('Ya tienes acceso a la comunidad.')
  await expect(dialog).toBeHidden()
  expect(bodies).toEqual([{ planId: 9, paymentMethod: 'PAYPAL', autoRenew: false }])
})

test('un pago rechazado se explica en el diálogo sin cerrarlo', async ({ page }) => {
  await signIn(page)
  await mockCatalog(page)
  await mockApi(page, '**/subscriptions', (route) => route.fulfill({ status: 402, json: { statusCode: 402, message: 'Pago rechazado por el emisor' } }))
  await page.goto('/communities/1/plans?plan=9')

  const dialog = page.getByRole('dialog', { name: 'Confirma tu suscripción' })
  await dialog.getByRole('button', { name: 'Confirmar y pagar' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Pago rechazado por el emisor')
  await expect(dialog.getByRole('button', { name: 'Confirmar y pagar' })).toBeEnabled()
})

test('quien aún no tiene perfil lo crea antes de suscribirse', async ({ page }) => {
  await signIn(page, false)
  await mockCatalog(page)
  await page.goto('/communities/1/plans')
  await page.getByRole('button', { name: 'Suscribirme a Acceso mensual' }).click()
  await expect(page).toHaveURL(/\/profile\/new$/)
})

test('sin planes activos se muestra un estado vacío', async ({ page }) => {
  await mockCatalog(page, [{ ...monthly, isActive: false }])
  await page.goto('/communities/1/plans')
  await expect(page.getByRole('heading', { name: 'Todavía no hay planes disponibles.' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Suscribirme/ })).toHaveCount(0)
})

test('un titular inexistente se informa y un fallo del servidor permite reintentar', async ({ page }) => {
  let shouldFail = true
  await mockApi(page, '**/plans?**', (route) => shouldFail
    ? route.fulfill({ status: 500, json: { statusCode: 500, message: 'Fallo del servidor' } })
    : route.fulfill({ json: pageOf([authorPlan]) }))
  await mockApi(page, '**/profiles/7', (route) => route.fulfill({ json: author }))
  await mockApi(page, '**/profiles/99', (route) => route.fulfill({ status: 404, json: { statusCode: 404, message: 'Perfil no encontrado' } }))

  await page.goto('/profiles/7/plans')
  await expect(page.getByRole('alert')).toContainText('Fallo del servidor')
  shouldFail = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('heading', { name: 'Lector fiel' })).toBeVisible()

  shouldFail = false
  await page.goto('/profiles/99/plans')
  await expect(page.getByRole('heading', { name: 'Autor no encontrado' })).toBeVisible()
  await page.goto('/profiles/99')
  await expect(page.getByRole('heading', { name: 'Perfil no encontrado' })).toBeVisible()
})

const activeSubscription = (plan: unknown) => ({ id: 1, planId: 9, plan, status: 'ACTIVE', startDate: '2026-11-03T00:00:00.000Z', endDate: '2026-12-03T12:00:00.000Z' })

test('un pago rechazado no crea la suscripción, conserva el método y permite reintentar', async ({ page }) => {
  const bodies: Record<string, unknown>[] = []
  await signIn(page)
  await mockCatalog(page)
  await mockApi(page, '**/subscriptions', (route) => {
    bodies.push(route.request().postDataJSON())
    return bodies.length === 1
      ? route.fulfill({ status: 402, json: { statusCode: 402, message: 'Fondos insuficientes' } })
      : route.fulfill({ status: 201, json: activeSubscription(monthly) })
  })
  await page.goto('/communities/1/plans?plan=9')

  const dialog = page.getByRole('dialog', { name: 'Confirma tu suscripción' })
  await dialog.getByLabel('Medio de pago').selectOption('BANK_TRANSFER')
  await dialog.getByRole('button', { name: 'Confirmar y pagar' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Fondos insuficientes')
  await expect(dialog.getByLabel('Medio de pago')).toHaveValue('BANK_TRANSFER')
  await expect(page.getByText('Tu suscripción está activa.')).toHaveCount(0)

  await dialog.getByRole('button', { name: 'Confirmar y pagar' }).click()
  await expect(page.getByText('Tu suscripción está activa.')).toBeVisible()
  await expect(dialog).toBeHidden()
  expect(bodies.map((body) => body.paymentMethod)).toEqual(['BANK_TRANSFER', 'BANK_TRANSFER'])
})

test('el pago se bloquea mientras se procesa y no se cobra dos veces', async ({ page }) => {
  let requests = 0
  let release = () => {}
  const held = new Promise<void>((resolve) => { release = resolve })
  await signIn(page)
  await mockCatalog(page)
  await mockApi(page, '**/subscriptions', async (route) => {
    requests += 1
    await held
    await route.fulfill({ status: 201, json: activeSubscription(monthly) })
  })
  await page.goto('/communities/1/plans?plan=9')

  const dialog = page.getByRole('dialog', { name: 'Confirma tu suscripción' })
  await dialog.getByRole('button', { name: 'Confirmar y pagar' }).dblclick()
  await expect(dialog.getByRole('button', { name: 'Procesando…' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  await expect(dialog.getByLabel('Medio de pago')).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()

  release()
  await expect(page.getByText('Tu suscripción está activa.')).toBeVisible()
  expect(requests).toBe(1)
})

test('tras pagar desde un ensayo bloqueado se puede volver a leerlo completo', async ({ page }) => {
  let subscribed = false
  await signIn(page)
  await mockCatalog(page, [authorPlan])
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: {
    id: 5, authorId: 7, title: 'Ensayo premium', description: '', content: subscribed ? 'El texto completo.' : 'Solo un adelanto.', isPremium: true, locked: !subscribed,
    status: 'PUBLISHED', communityId: null, publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
  } }))
  await mockApi(page, '**/subscriptions', (route) => {
    subscribed = true
    return route.fulfill({ status: 201, json: activeSubscription(authorPlan) })
  })

  await page.goto('/articles/5')
  await page.getByRole('link', { name: 'Suscribirme', exact: true }).click()
  await page.getByRole('button', { name: 'Suscribirme a Lector fiel' }).click()
  await page.getByRole('button', { name: 'Confirmar y pagar' }).click()

  const confirmation = page.getByRole('status')
  await expect(confirmation).toContainText('vigente hasta el 3 de diciembre de 2026')
  await expect(confirmation).toContainText('Ya puedes leer sus ensayos premium.')
  await confirmation.getByRole('link', { name: 'Leer el ensayo' }).click()
  await expect(page).toHaveURL(/\/articles\/5$/)
  await expect(page.getByText('El texto completo.')).toBeVisible()
  await expect(page.getByText('Estás leyendo un adelanto premium.')).toHaveCount(0)
})

test('tras pagar un plan de comunidad el lector ya figura como miembro', async ({ page }) => {
  let subscribed = false
  await signIn(page)
  await mockCatalog(page)
  await mockApi(page, '**/articles**', (route) => route.fulfill({ json: pageOf([]) }))
  await mockApi(page, '**/communities/1/members**', (route, url) => {
    const isActiveList = (url.searchParams.get('status') ?? 'ACTIVE') === 'ACTIVE'
    return route.fulfill({ json: pageOf(subscribed && isActiveList ? [{ profileId: 8, communityId: 1, role: 'MEMBER', status: 'ACTIVE', joinedAt: '2026-11-03T00:00:00.000Z', profile: { ...author, id: 8, username: 'lector', name: 'Lector' } }] : []) })
  })
  await mockApi(page, '**/subscriptions', (route) => {
    subscribed = true
    return route.fulfill({ status: 201, json: activeSubscription(monthly) })
  })

  await page.goto('/communities/1')
  await page.getByRole('link', { name: 'Suscribirme' }).click()
  await expect(page).toHaveURL(/\/communities\/1\/plans$/)
  await page.getByRole('button', { name: 'Suscribirme a Acceso mensual' }).click()
  await page.getByRole('button', { name: 'Confirmar y pagar' }).click()

  const confirmation = page.getByRole('status')
  await expect(confirmation).toContainText('Ya tienes acceso a la comunidad.')
  await confirmation.getByRole('link', { name: 'Ir a la comunidad' }).click()
  await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Solicitar acceso' })).toHaveCount(0)
})

test('una comunidad premium sin planes permite solicitar acceso sin pagar', async ({ page }) => {
  await signIn(page)
  await mockCatalog(page, [])
  await mockApi(page, '**/communities/1/members', (route) => route.fulfill({ status: 201, json: { profileId: 8, communityId: 1, role: 'MEMBER', status: 'PENDING', joinedAt: '2026-11-03T00:00:00.000Z' } }))
  await page.goto('/communities/1/plans')

  await page.getByRole('button', { name: 'Solicitar acceso' }).click()
  await expect(page.getByRole('status')).toHaveText('Tu solicitud quedó pendiente de aprobación.')
})
