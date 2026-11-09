import { expect, test, type Page, type Route } from '@playwright/test'

const owner = {
  id: 1, ownerId: 7, name: 'Club de lectura', topic: 'Literatura', description: 'Lecturas.',
  isPremium: false, createdAt: '2026-01-01T00:00:00.000Z', tags: [],
}
const member = { ...owner, id: 2, ownerId: 8, name: 'Ciencia abierta', topic: 'Ciencia' }
const pageOf = (data: unknown[], total = data.length) => ({ data, total, page: 1, limit: 20 })

function token(userId = 7) {
  const payload = btoa(JSON.stringify({ sub: String(userId), email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  return `header.${payload}.signature`
}

async function setup(page: Page, options: { memberships?: unknown[]; deleteStatus?: number; deleteMessage?: string; deleteDelay?: number } = {}) {
  const { memberships = [{ role: 'OWNER', community: owner }, { role: 'MEMBER', community: member }], deleteStatus = 204, deleteMessage = '', deleteDelay = 0 } = options
  let deletes = 0
  await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token())
  await page.route((url) => url.pathname.startsWith('/'), async (route: Route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
    const url = new URL(request.url())
    if (url.pathname === '/profiles/me' && request.method() === 'GET') return route.fulfill({ json: { id: 7, username: 'owner', name: 'Owner' } })
    if (url.pathname === '/notifications/unread-count' && request.method() === 'GET') return route.fulfill({ json: { unread: 0 } })
    if (url.pathname.startsWith('/notifications')) return route.fulfill({ json: url.pathname.endsWith('unread-count') ? { unread: 0 } : pageOf([]) })
    if (url.pathname === '/communities/mine' && request.method() === 'GET') return route.fulfill({ json: pageOf(memberships) })
    if (url.pathname.startsWith('/communities/') && request.method() === 'DELETE') {
      deletes += 1
      if (deleteDelay > 0) await new Promise((resolve) => setTimeout(resolve, deleteDelay))
      if (deleteStatus === 204) return route.fulfill({ status: 204 })
      return route.fulfill({ status: deleteStatus, json: { statusCode: deleteStatus, message: deleteMessage } })
    }
    return route.fallback()
  })
  return { get deletes() { return deletes } }
}

test('muestra comunidades y rol, pero solo propietario ve eliminar', async ({ page }) => {
  await setup(page)
  await page.goto('/communities/mine')
  await expect(page.getByRole('heading', { name: 'Mis comunidades' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Club de lectura', exact: true })).toBeVisible()
  await expect(page.getByText('Tu rol: Propietario')).toBeVisible()
  await expect(page.getByText('Tu rol: Miembro')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(1)
})

test('cancelar no elimina y conserva la comunidad', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/communities/mine')
  await page.getByRole('button', { name: 'Eliminar' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Eliminar Club de lectura?' })
  await expect(dialog).toContainText('se perderán su contenido y todas sus membresías')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Club de lectura', exact: true })).toBeVisible()
  expect(calls.deletes).toBe(0)
})

test('204 elimina solo la comunidad confirmada sin recargar', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/communities/mine')
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar comunidad' }).click()
  await expect(page.getByRole('heading', { name: 'Club de lectura', exact: true })).toHaveCount(0)
  await expect(page.getByText('Ciencia abierta')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('eliminada correctamente')
  expect(calls.deletes).toBe(1)
})

test('403 conserva comunidad y muestra motivo', async ({ page }) => {
  const calls = await setup(page, { deleteStatus: 403, deleteMessage: 'Solo el propietario puede eliminarla' })
  await page.goto('/communities/mine')
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar comunidad' }).click()
  await expect(page.getByRole('alert')).toContainText('Solo el propietario puede eliminarla')
  await expect(page.getByRole('heading', { name: 'Club de lectura', exact: true })).toBeVisible()
  expect(calls.deletes).toBe(1)
})

test('permite reintentar tras error y bloquea doble confirmación', async ({ page }) => {
  const calls = await setup(page, { deleteStatus: 500, deleteMessage: 'Error del servidor', deleteDelay: 200 })
  await page.goto('/communities/mine')
  await page.getByRole('button', { name: 'Eliminar' }).click()
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Eliminar comunidad' })
  await Promise.all([confirm.click(), confirm.click()])
  await expect(page.getByRole('alert')).toContainText('Error del servidor')
  expect(calls.deletes).toBe(1)
})

test('muestra estado vacío sin comunidades', async ({ page }) => {
  await setup(page, { memberships: [] })
  await page.goto('/communities/mine')
  await expect(page.getByText('No perteneces a ninguna comunidad todavía.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Descubrir comunidades' })).toBeVisible()
})

test('mantiene acciones accesibles en desktop, tablet y móvil', async ({ page }) => {
  await setup(page)
  for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/communities/mine')
    await expect(page.getByRole('heading', { name: 'Mis comunidades' })).toBeVisible()
    await page.getByRole('button', { name: 'Eliminar' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
  }
})
