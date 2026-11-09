import { expect, test, type Page, type Route } from '@playwright/test'

const OWNER_ID = 7
const community = {
  id: 1, ownerId: OWNER_ID, owner: { id: OWNER_ID, name: 'María López', profilePhoto: null },
  name: 'Club de lectura', topic: 'Literatura', description: 'Lecturas y conversaciones.', isPremium: false,
  createdAt: '2026-01-01T00:00:00.000Z', memberCount: 12,
  tags: [{ communityId: 1, tag: 'novela', community: null }, { communityId: 1, tag: 'ensayo', community: null }],
}
const empty = { data: [], total: 0, page: 1, limit: 20 }

function token(userId: number) {
  return `header.${btoa(JSON.stringify({ sub: String(userId), email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
}
async function api(page: Page, match: (pathname: string, method: string) => boolean, handler: (route: Route) => void | Promise<void>) {
  await page.route((url) => url.pathname.startsWith('/'), (route) => {
    const request = route.request()
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.fallback()
    if (!match(new URL(request.url()).pathname, request.method())) return route.fallback()
    return handler(route)
  })
}

interface Calls { patch: Record<string, unknown>[]; tags: string[][] }
async function setup(page: Page, options: { userId?: number | null; patchStatus?: number; patchMessage?: string; tagsStatus?: number; tagsMessage?: string } = {}) {
  const { userId = OWNER_ID, patchStatus = 200, patchMessage = '', tagsStatus = 200, tagsMessage = '' } = options
  const calls: Calls = { patch: [], tags: [] }
  if (userId !== null) {
    await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token(userId))
    await api(page, (p) => p === '/profiles/me', (route) => route.fulfill({ json: { id: userId, username: 'user', name: 'Usuario' } }))
  }
  await api(page, (p, m) => p === '/communities/1' && m === 'GET', (route) => route.fulfill({ json: community }))
  await api(page, (p, m) => p === '/communities/1' && m === 'PATCH', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    calls.patch.push(body)
    if (patchStatus !== 200) return route.fulfill({ status: patchStatus, json: { statusCode: patchStatus, message: patchMessage } })
    return route.fulfill({ json: { ...community, ...body } })
  })
  await api(page, (p, m) => p === '/communities/1/tags' && m === 'PUT', (route) => {
    const { tags } = route.request().postDataJSON() as { tags: string[] }
    calls.tags.push(tags)
    if (tagsStatus !== 200) return route.fulfill({ status: tagsStatus, json: { statusCode: tagsStatus, message: tagsMessage } })
    return route.fulfill({ json: [...tags].sort() })
  })
  await api(page, (p) => p === '/communities/1/members', (route) => route.fulfill({ json: empty }))
  await api(page, (p) => p === '/articles' || p === '/posts', (route) => route.fulfill({ json: empty }))
  return calls
}

test('solo el propietario ve el botón para editar la comunidad', async ({ page }) => {
  await setup(page)
  await page.goto('/communities/1')
  await expect(page.getByRole('link', { name: 'Editar comunidad' })).toHaveAttribute('href', '/communities/1/edit')
  // El propietario no se une ni se suscribe a su propia comunidad, aunque no haya fila de membresía.
  await expect(page.getByRole('button', { name: 'Propietario' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Unirme' })).toHaveCount(0)
})

test('quien no es propietario no ve el botón de editar', async ({ page }) => {
  await setup(page, { userId: 99 })
  await page.goto('/communities/1')
  await expect(page.getByRole('heading', { name: 'Club de lectura' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Editar comunidad' })).toHaveCount(0)
})

test('un visitante sin sesión no ve el botón de editar', async ({ page }) => {
  await setup(page, { userId: null })
  await page.goto('/communities/1')
  await expect(page.getByRole('heading', { name: 'Club de lectura' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Editar comunidad' })).toHaveCount(0)
})

test('quien no es propietario no puede abrir el formulario de edición', async ({ page }) => {
  const calls = await setup(page, { userId: 99 })
  await page.goto('/communities/1/edit')
  await expect(page.getByRole('heading', { name: 'No puedes editar esta comunidad' })).toBeVisible()
  await expect(page.getByLabel('Nombre de la comunidad')).toHaveCount(0)
  expect(calls.patch).toHaveLength(0)
})

test('el propietario edita nombre, temática y etiquetas', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/communities/1/edit')
  await expect(page.getByRole('heading', { name: 'Editar comunidad' })).toBeVisible()
  // El formulario llega cargado con los datos actuales.
  await expect(page.getByLabel('Nombre de la comunidad')).toHaveValue('Club de lectura')
  await expect(page.getByLabel('Temática')).toHaveValue('Literatura')
  await expect(page.getByLabel('Descripción')).toHaveValue('Lecturas y conversaciones.')
  await expect(page.getByRole('list', { name: 'Etiquetas seleccionadas' }).getByRole('listitem')).toHaveCount(2)

  await page.getByLabel('Nombre de la comunidad').fill('Club de lectura contemporánea')
  await page.getByLabel('Descripción').fill('')
  await page.getByRole('button', { name: 'Eliminar etiqueta novela' }).click()
  await page.getByLabel('Añadir etiqueta').fill('poesía')
  await page.getByLabel('Añadir etiqueta').press('Enter')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()

  await expect(page).toHaveURL(/\/communities\/1\?updated=1$/)
  await expect(page.getByText('Cambios guardados correctamente.')).toBeVisible()
  // Las etiquetas no van en el PATCH (el backend las recibe por su propio endpoint).
  expect(calls.patch).toEqual([{ name: 'Club de lectura contemporánea', topic: 'Literatura', description: '', isPremium: false }])
  expect(calls.tags).toEqual([['ensayo', 'poesía']])
})

test('si solo cambian los datos no se vuelven a enviar las etiquetas', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/communities/1/edit')
  await page.getByLabel('Temática').fill('Narrativa')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page).toHaveURL(/\/communities\/1\?updated=1$/)
  expect(calls.patch).toHaveLength(1)
  expect(calls.tags).toHaveLength(0)
})

test('si no cambian datos ni etiquetas no envía peticiones de actualización', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/communities/1/edit')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page).toHaveURL(/\/communities\/1\?updated=1$/)
  expect(calls.patch).toHaveLength(0)
  expect(calls.tags).toHaveLength(0)
})

test('un nombre repetido se muestra en el campo y conserva lo escrito', async ({ page }) => {
  await setup(page, { patchStatus: 409, patchMessage: "Ya existe una comunidad llamada 'Otra'" })
  await page.goto('/communities/1/edit')
  await page.getByLabel('Nombre de la comunidad').fill('Otra')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Ya existe una comunidad con ese nombre')).toBeVisible()
  await expect(page.getByLabel('Nombre de la comunidad')).toHaveValue('Otra')
  await expect(page).toHaveURL(/\/communities\/1\/edit$/)
})

test('si el backend rechaza con 403 se explica que solo el propietario puede editar', async ({ page }) => {
  await setup(page, { patchStatus: 403, patchMessage: 'Solo el propietario puede modificar la comunidad' })
  await page.goto('/communities/1/edit')
  await page.getByLabel('Temática').fill('Narrativa')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Solo el propietario puede modificar la comunidad' })).toBeVisible()
})

test('si fallan las etiquetas después del PATCH conserva el formulario y permite reintentar', async ({ page }) => {
  const calls = await setup(page, { tagsStatus: 500, tagsMessage: 'No se pudieron actualizar las etiquetas' })
  await page.goto('/communities/1/edit')
  await page.getByLabel('Temática').fill('Narrativa')
  await page.getByRole('button', { name: 'Eliminar etiqueta novela' }).click()
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Los datos se guardaron, pero las etiquetas no' })).toBeVisible()
  await expect(page.getByLabel('Temática')).toHaveValue('Narrativa')
  await expect(page).toHaveURL(/\/communities\/1\/edit$/)
  expect(calls.patch).toHaveLength(1)
  expect(calls.tags).toHaveLength(1)
})
