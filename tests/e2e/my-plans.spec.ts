import { expect, test, type Page, type Route } from '@playwright/test'

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }
const authorPlan = { id: 1, authorId: 8, communityId: null, name: 'Lector fiel', price: 4500.5, currency: 'COP', billingPeriod: 'MONTHLY', isActive: true }
const communityPlan = { id: 2, authorId: null, communityId: 3, name: 'Club anual', price: 48, currency: 'USD', billingPeriod: 'YEARLY', isActive: false }

const memberships = [
  { profileId: 8, communityId: 3, role: 'OWNER', status: 'ACTIVE', community: { id: 3, name: 'Club de ciencia', isPremium: true } },
  { profileId: 8, communityId: 4, role: 'OWNER', status: 'ACTIVE', community: { id: 4, name: 'Club gratuito', isPremium: false } },
  { profileId: 8, communityId: 5, role: 'MEMBER', status: 'ACTIVE', community: { id: 5, name: 'Ajena', isPremium: true } },
]

function tokenFor(userId = '8') {
  const payload = btoa(JSON.stringify({ sub: userId, email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  return `header.${payload}.signature`
}

async function mockApi(page: Page, path: string, handler: (route: Route, url: URL) => Promise<void> | void) {
  await page.route(path, async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    await handler(route, new URL(route.request().url()))
  })
}

async function setup(page: Page, plans: unknown[] = [authorPlan, communityPlan]) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await mockApi(page, '**/profiles/me', (route) => route.fulfill({ json: me }))
  await mockApi(page, '**/communities/mine**', (route) => route.fulfill({ json: { data: memberships, total: memberships.length, page: 1, limit: 100 } }))
  await mockApi(page, '**/plans/mine**', (route) => route.fulfill({ json: { data: plans, total: plans.length, page: 1, limit: 100 } }))
}

const planRow = (page: Page, name: string) => page.getByRole('list', { name: 'Mis planes' }).getByRole('listitem').filter({ hasText: name })

test('"Mis planes" exige sesión', async ({ page }) => {
  await page.goto('/app/plans')
  await expect(page).toHaveURL(/\/login$/)
})

test('se llega desde el menú de la cuenta y lista cada plan con su estado', async ({ page }) => {
  await setup(page)
  await mockApi(page, '**/articles**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } }))
  await page.goto('/')
  await page.getByRole('button', { name: /^Cuenta de/ }).click()
  await page.getByRole('menuitem', { name: 'Mis planes' }).click()
  await expect(page).toHaveURL(/\/app\/plans$/)

  const author = planRow(page, 'Lector fiel')
  await expect(author).toContainText('Activo')
  await expect(author).toContainText('4.500,50')
  await expect(author).toContainText('COP / mes')
  await expect(author).toContainText('Plan de autor')

  const community = planRow(page, 'Club anual')
  await expect(community).toContainText('Inactivo')
  await expect(community).toContainText('USD / año')
  await expect(community).toContainText('Comunidad: Club de ciencia')
})

test('sin planes se invita a crear el primero', async ({ page }) => {
  await setup(page, [])
  await page.goto('/app/plans')
  await expect(page.getByRole('heading', { name: 'Todavía no tienes planes.' })).toBeVisible()
  await page.getByRole('link', { name: 'Crear plan' }).click()
  await expect(page).toHaveURL(/\/app\/plans\/new$/)
})

test('crea un plan de autor con los datos del formulario, aceptando coma decimal', async ({ page }) => {
  const bodies: unknown[] = []
  await setup(page)
  await mockApi(page, '**/plans', (route) => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { ...authorPlan, id: 9, name: 'Nuevo' } })
  })
  await page.goto('/app/plans/new')

  await page.getByLabel('Nombre del plan').fill('  Nuevo  ')
  await page.getByLabel('Precio').fill('4500,50')
  await page.getByLabel('Moneda').selectOption('USD')
  await page.getByLabel('Periodo de facturación').selectOption('YEARLY')
  await page.getByRole('button', { name: 'Crear plan' }).click()

  await expect(page).toHaveURL(/\/app\/plans$/)
  await expect(page.getByRole('status').first()).toHaveText('Se creó “Nuevo”.')
  expect(bodies).toEqual([{ name: 'Nuevo', price: 4500.5, currency: 'USD', billingPeriod: 'YEARLY' }])
})

test('solo ofrece las comunidades propias, las asocia y avisa si son gratuitas', async ({ page }) => {
  const bodies: unknown[] = []
  await setup(page)
  await mockApi(page, '**/plans', (route) => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: { ...communityPlan, id: 9 } })
  })
  await page.goto('/app/plans/new')

  const community = page.getByLabel('Asociar a')
  await expect(community.locator('option', { hasText: 'Club de ciencia' })).toHaveCount(1)
  await expect(community.locator('option', { hasText: 'Ajena' })).toHaveCount(0)

  await community.selectOption({ label: 'Club gratuito' })
  await expect(page.getByText('es gratuita: sus lectores no verán el acceso')).toBeVisible()
  await community.selectOption({ label: 'Club de ciencia' })
  await expect(page.getByText('es gratuita')).toHaveCount(0)

  await page.getByLabel('Nombre del plan').fill('Del club')
  await page.getByLabel('Precio').fill('10')
  await page.getByRole('button', { name: 'Crear plan' }).click()
  await expect(page).toHaveURL(/\/app\/plans$/)
  expect(bodies).toEqual([{ name: 'Del club', price: 10, currency: 'COP', billingPeriod: 'MONTHLY', communityId: 3 }])
})

test('valida por campo antes de enviar y limpia el error al corregir', async ({ page }) => {
  let requests = 0
  await setup(page)
  await mockApi(page, '**/plans', (route) => {
    requests += 1
    return route.fulfill({ status: 201, json: authorPlan })
  })
  await page.goto('/app/plans/new')

  const name = page.getByLabel('Nombre del plan')
  const price = page.getByLabel('Precio')
  await page.getByRole('button', { name: 'Crear plan' }).click()
  await expect(page.getByText('El nombre es obligatorio')).toBeVisible()
  await expect(page.getByText('El precio es obligatorio')).toBeVisible()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toBeFocused()

  await name.fill('Plan')
  await expect(page.getByText('El nombre es obligatorio')).toHaveCount(0)
  for (const [value, message] of [['1.000,50', 'máximo 2 decimales'], ['0', 'El precio mínimo'], ['100000000', 'demasiado alto']]) {
    await price.fill(value)
    await page.getByRole('button', { name: 'Crear plan' }).click()
    await expect(page.getByText(message)).toBeVisible()
  }
  expect(requests).toBe(0)
})

test('los errores del backend se muestran en su campo y los permisos se explican', async ({ page }) => {
  let response = { status: 400, json: { statusCode: 400, message: ['La moneda debe ser un código ISO 4217 (USD, EUR, COP…)', 'El precio admite máximo 2 decimales', 'Algo inesperado'] } }
  await setup(page)
  await mockApi(page, '**/plans', (route) => route.fulfill(response))
  await page.goto('/app/plans/new')

  await page.getByLabel('Nombre del plan').fill('Plan')
  await page.getByLabel('Precio').fill('10')
  await page.getByRole('button', { name: 'Crear plan' }).click()
  await expect(page.locator('#plan-currency-error')).toHaveText('La moneda debe ser un código ISO 4217 (USD, EUR, COP…)')
  await expect(page.getByLabel('Moneda')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Precio')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toHaveText('Algo inesperado')
  await expect(page.getByLabel('Nombre del plan')).toHaveValue('Plan')

  response = { status: 403, json: { statusCode: 403, message: ['Solo el propietario puede crear planes de la comunidad'] } }
  await page.getByRole('button', { name: 'Crear plan' }).click()
  await expect(page.getByRole('alert')).toContainText('No tienes permiso para crear o editar este plan')
})

test('al editar solo envía nombre y precio, y bloquea lo que no se puede cambiar', async ({ page }) => {
  const bodies: unknown[] = []
  await setup(page)
  await mockApi(page, '**/plans/2', (route) => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ json: { ...communityPlan, name: 'Club renovado', price: 50 } })
  })
  await page.goto('/app/plans')
  await page.getByRole('link', { name: 'Editar “Club anual”' }).click()
  await expect(page).toHaveURL(/\/app\/plans\/2\/edit$/)

  await expect(page.getByLabel('Nombre del plan')).toHaveValue('Club anual')
  await expect(page.getByLabel('Precio')).toHaveValue('48')
  await expect(page.getByLabel('Moneda')).toBeDisabled()
  await expect(page.getByLabel('Moneda')).toHaveValue('USD')
  await expect(page.getByLabel('Periodo de facturación')).toBeDisabled()
  await expect(page.getByLabel('Periodo de facturación')).toHaveValue('YEARLY')
  await expect(page.getByLabel('Asociar a')).toBeDisabled()
  await expect(page.getByLabel('Asociar a')).toHaveValue('3')
  await expect(page.getByText('afectarían a quienes ya pagaron')).toBeVisible()

  await page.getByLabel('Nombre del plan').fill('Club renovado')
  await page.getByLabel('Precio').fill('50')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page).toHaveURL(/\/app\/plans$/)
  await expect(page.getByRole('status').first()).toHaveText('Se guardaron los cambios de “Club renovado”.')
  expect(bodies).toEqual([{ name: 'Club renovado', price: 50 }])
})

test('un plan ajeno o inexistente no se puede editar y se explica por qué', async ({ page }) => {
  await setup(page)
  await page.goto('/app/plans/99/edit')
  await expect(page.getByRole('alert')).toContainText('No puedes editar este plan')
  await expect(page.getByLabel('Nombre del plan')).toHaveCount(0)
})

test('activa y desactiva, e informa si no hay permiso', async ({ page }) => {
  const bodies: unknown[] = []
  let forbidden = false
  await setup(page)
  await mockApi(page, '**/plans/1', (route) => {
    if (forbidden) return route.fulfill({ status: 403, json: { statusCode: 403, message: 'Este plan pertenece a otro perfil' } })
    const body = route.request().postDataJSON()
    bodies.push(body)
    return route.fulfill({ json: { ...authorPlan, ...body } })
  })
  await page.goto('/app/plans')

  await page.getByRole('button', { name: 'Desactivar “Lector fiel”' }).click()
  await expect(planRow(page, 'Lector fiel')).toContainText('Inactivo')
  await expect(page.getByRole('status').first()).toContainText('no admite suscripciones nuevas')
  await page.getByRole('button', { name: 'Activar “Lector fiel”' }).click()
  await expect(planRow(page, 'Lector fiel')).toContainText('Activo')
  expect(bodies).toEqual([{ isActive: false }, { isActive: true }])

  forbidden = true
  await page.getByRole('button', { name: 'Desactivar “Lector fiel”' }).click()
  await expect(page.getByRole('alert')).toContainText('No tienes permiso para gestionar este plan')
  await expect(planRow(page, 'Lector fiel')).toContainText('Activo')
})

test('eliminar pide confirmación y quita el plan', async ({ page }) => {
  const deleted: string[] = []
  await setup(page)
  await mockApi(page, '**/plans/1', (route, url) => {
    deleted.push(url.pathname)
    return route.fulfill({ status: 204 })
  })
  await page.goto('/app/plans')

  const dialog = page.getByRole('dialog', { name: '¿Eliminar plan?' })
  await page.getByRole('button', { name: 'Eliminar “Lector fiel”' }).click()
  await expect(dialog).toContainText('4.500,50 COP / mes')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  expect(deleted).toEqual([])

  await page.getByRole('button', { name: 'Eliminar “Lector fiel”' }).click()
  await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click()
  await expect(dialog).toBeHidden()
  await expect(planRow(page, 'Lector fiel')).toHaveCount(0)
  await expect(page.getByRole('status').first()).toHaveText('Se eliminó “Lector fiel”.')
  expect(deleted).toEqual(['/plans/1'])
})

test('un plan con suscripciones no se elimina y se ofrece desactivarlo', async ({ page }) => {
  await setup(page)
  await mockApi(page, '**/plans/1', (route) => route.fulfill({ status: 409, json: { statusCode: 409, message: 'El plan tiene 2 suscripción(es); desactívalo con isActive en lugar de borrarlo' } }))
  await page.goto('/app/plans')

  await page.getByRole('button', { name: 'Eliminar “Lector fiel”' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Eliminar plan?' })
  await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Este plan tiene suscripciones y no se puede eliminar. Puedes desactivarlo para que no admita nuevas.')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(planRow(page, 'Lector fiel')).toHaveCount(1)
})

test('si fallan las comunidades se puede crear un plan de autor igualmente', async ({ page }) => {
  await setup(page)
  await mockApi(page, '**/communities/mine**', (route) => route.fulfill({ status: 500, json: { statusCode: 500, message: 'Fallo' } }))
  await page.goto('/app/plans/new')
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar tus comunidades')
  await expect(page.getByLabel('Nombre del plan')).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Crear plan' })).toBeEnabled()
})
