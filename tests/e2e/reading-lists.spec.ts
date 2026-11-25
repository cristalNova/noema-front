import { expect, test, type Page } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(({ page }) => mockBackgroundApis(page))

const profile = { id: 2, username: 'lector', name: 'Lector', followersCount: 0, isVerified: false }

async function signIn(page: Page) {
  const payload = btoa(JSON.stringify({ sub: 2, email: 'reader@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), `header.${payload}.signature`)
  await page.route('**/profiles/me', (route) => route.fulfill({ json: profile }))
}

test('crea, edita y elimina listas; solo las públicas aparecen en el perfil', async ({ page }) => {
  await signIn(page)
  let nextId = 1
  let lists: Array<{ id: number; profileId: number; name: string; status: string; visibility: string; items: unknown[]; createdAt: string }> = []
  await page.route((url) => url.pathname === '/reading-lists' || url.pathname === '/reading-lists/mine' || /^\/reading-lists\/\d+$/.test(url.pathname) || url.pathname === '/reading-lists/profile/2', (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (pathname === '/reading-lists/mine') return route.fulfill({ json: lists })
    if (pathname === '/reading-lists/profile/2') return route.fulfill({ json: lists })
    if (request.method() === 'POST') {
      const input = request.postDataJSON() as { name: string; status: string; visibility: string }
      const created = { ...input, id: nextId++, profileId: 2, items: [], createdAt: '2026-11-01T12:00:00.000Z' }
      lists = [created, ...lists]
      return route.fulfill({ status: 201, json: created })
    }
    const id = Number(pathname.split('/').at(-1))
    if (request.method() === 'PATCH') {
      const updated = { ...lists.find((list) => list.id === id)!, ...request.postDataJSON() as object }
      lists = lists.map((list) => list.id === id ? updated : list)
      return route.fulfill({ json: updated })
    }
    if (request.method() === 'DELETE') { lists = lists.filter((list) => list.id !== id); return route.fulfill({ status: 204, body: '' }) }
    return route.fallback()
  })
  await page.route('**/profiles/2', (route) => route.request().resourceType() === 'document' ? route.fallback() : route.fulfill({ json: profile }))
  await page.route((url) => url.pathname === '/articles' && url.searchParams.get('authorId') === '2', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } }))

  await page.goto('/app/reading-lists')
  await expect(page.getByRole('heading', { name: 'Aún no tienes listas.' })).toBeVisible()
  await page.getByRole('button', { name: 'Crear lista' }).click()
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Lecturas de vacaciones')
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('READING')
  await page.getByRole('button', { name: 'Crear lista' }).click()
  await expect(page.getByText('Leyendo · Privada · 0 ensayos')).toBeVisible()
  await page.getByRole('button', { name: 'Editar Lecturas de vacaciones' }).click()
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Recomendadas')
  await page.getByRole('combobox', { name: 'Estado' }).selectOption('READ')
  await page.getByRole('combobox', { name: 'Visibilidad' }).selectOption('PUBLIC')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Leído · Pública · 0 ensayos')).toBeVisible()

  await page.getByRole('button', { name: 'Nueva lista' }).click()
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Notas privadas')
  await page.getByRole('button', { name: 'Crear lista' }).click()
  await page.goto('/profiles/2')
  await expect(page.getByText('Recomendadas')).toBeVisible()
  await expect(page.getByText('Notas privadas')).toHaveCount(0)

  await page.goto('/app/reading-lists')
  await page.getByRole('button', { name: 'Eliminar Recomendadas' }).click()
  const confirm = page.getByRole('dialog', { name: '¿Eliminar lista?' })
  await expect(confirm).toContainText('Recomendadas')
  await confirm.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('heading', { name: 'Recomendadas' })).toBeVisible()
  await page.getByRole('button', { name: 'Eliminar Recomendadas' }).click()
  await confirm.getByRole('button', { name: 'Eliminar lista' }).click()
  await expect(page.getByRole('heading', { name: 'Recomendadas' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Notas privadas' })).toBeVisible()
})

test('muestra el número de ensayos y vuelve de página al quitar la última lista', async ({ page }) => {
  await signIn(page)
  let lists = Array.from({ length: 9 }, (_, index) => ({ id: index + 1, profileId: 2, name: `Lista ${index + 1}`, status: 'WANT_TO_READ', visibility: 'PRIVATE', items: index === 0 ? [{ articleId: 4 }, { articleId: 5 }] : [], createdAt: '2026-11-01T12:00:00.000Z' }))
  await page.route((url) => url.pathname === '/reading-lists/mine' || url.pathname === '/reading-lists/9', (route) => {
    if (route.request().method() === 'DELETE') { lists = lists.filter((list) => list.id !== 9); return route.fulfill({ status: 204, body: '' }) }
    return route.fulfill({ json: lists })
  })
  await page.goto('/app/reading-lists')
  await expect(page.getByText('Por leer · Privada · 2 ensayos')).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await page.getByRole('button', { name: 'Eliminar Lista 9' }).click()
  await page.getByRole('dialog', { name: '¿Eliminar lista?' }).getByRole('button', { name: 'Eliminar lista' }).click()
  await expect(page.getByText('Página 1 de 1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lista 1' })).toBeVisible()
})
