import { expect, test, type Page } from '@playwright/test'
import { mockBackgroundApis } from './support'

const profile = { id: 2, username: 'lector', name: 'Lector', followersCount: 0, isVerified: false }
const titles = new Map([[1, 'Primera lectura'], [2, 'Segunda lectura'], [3, 'Tercera lectura']])

async function signIn(page: Page) {
  const payload = btoa(JSON.stringify({ sub: 2, email: 'reader@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), `header.${payload}.signature`)
  await page.route('**/profiles/me', (route) => route.fulfill({ json: profile }))
}

async function mockLists(page: Page, initial: number[]) {
  let ids = [...initial]
  let posts = 0
  let rejectRemoval = false
  const summary = { id: 1, name: 'Por leer', status: 'WANT_TO_READ', visibility: 'PRIVATE', profileId: 2, createdAt: '2026-11-01T12:00:00.000Z' }
  await page.route((url) => url.pathname.startsWith('/reading-lists'), (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    const { pathname } = new URL(route.request().url())
    const method = route.request().method()
    if (pathname === '/reading-lists/mine') return route.fulfill({ json: [summary] }) // El backend no incluye items aquí.
    if (pathname === '/reading-lists/1' && method === 'GET') return route.fulfill({ json: { ...summary, items: ids.map((articleId, orderIndex) => ({ articleId, orderIndex, article: { id: articleId, title: titles.get(articleId), description: 'Lectura breve' } })) } })
    if (pathname === '/reading-lists/1/items' && method === 'POST') {
      posts += 1
      const { articleId } = route.request().postDataJSON() as { articleId: number }
      if (ids.includes(articleId)) return route.fulfill({ status: 409, json: { message: 'Ya existe' } })
      ids.push(articleId)
      return route.fulfill({ status: 201, json: { articleId, orderIndex: ids.length - 1 } })
    }
    if (pathname === '/reading-lists/1/items/order' && method === 'PUT') {
      ids = (route.request().postDataJSON() as { articleIds: number[] }).articleIds
      return route.fulfill({ json: ids.map((articleId, orderIndex) => ({ articleId, orderIndex })) })
    }
    if (pathname.startsWith('/reading-lists/1/items/') && method === 'DELETE') {
      if (rejectRemoval) return route.fulfill({ status: 500, json: { message: 'Error de prueba' } })
      ids = ids.filter((id) => id !== Number(pathname.split('/').at(-1)))
      return route.fulfill({ status: 204, body: '' })
    }
    return route.fallback()
  })
  return { ids: () => ids, posts: () => posts, failRemoval: () => { rejectRemoval = true }, allowRemoval: () => { rejectRemoval = false } }
}

test.beforeEach(({ page }) => mockBackgroundApis(page))

test('agrega desde un ensayo, avisa si ya está en la lista y no lo duplica', async ({ page }) => {
  await signIn(page)
  const api = await mockLists(page, [1, 2])
  await page.route('**/articles/3', (route) => route.request().resourceType() === 'document' ? route.fallback() : route.fulfill({ json: {
    id: 3, authorId: 7, author: { id: 7, name: 'Autora' }, title: 'Tercera lectura', description: 'Lectura breve', content: 'Texto de prueba',
    status: 'PUBLISHED', isPremium: false, communityId: null, publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
  } }))
  await page.route('**/comments/**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 10 } }))
  await page.goto('/articles/3')
  await page.getByRole('button', { name: 'Agregar a lista' }).click()
  const dialog = page.getByRole('dialog', { name: 'Agregar a una lista' })
  await expect(dialog.getByRole('combobox', { name: 'Elige una lista' })).toHaveValue('1')
  await dialog.getByRole('button', { name: 'Agregar ensayo' }).click()
  await expect(page.getByText('Ensayo agregado a «Por leer».')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar a lista' }).click()
  await dialog.getByRole('button', { name: 'Agregar ensayo' }).click()
  await expect(dialog.getByRole('alert')).toContainText('ya está en la lista')
  expect(api.posts()).toBe(1)
  expect(api.ids()).toEqual([1, 2, 3])
})

test('arrastra para guardar el orden y quita ensayos con reversión si falla', async ({ page }) => {
  await signIn(page)
  const api = await mockLists(page, [1, 2, 3])
  await page.goto('/app/reading-lists')
  await page.getByRole('link', { name: 'Por leer' }).click()
  const rows = page.getByRole('list', { name: 'Ensayos de la lista' }).getByRole('listitem')
  await expect(rows).toHaveCount(3)
  await rows.nth(2).getByRole('button', { name: /Mover «Tercera lectura»/ }).dragTo(rows.nth(0), { targetPosition: { x: 60, y: 20 } })
  await expect.poll(api.ids).toEqual([3, 1, 2])
  await page.reload()
  await expect(rows.first()).toContainText('Tercera lectura')
  await rows.first().getByRole('button', { name: /Mover «Tercera lectura»/ }).press('ArrowDown')
  await expect.poll(api.ids).toEqual([1, 3, 2])
  await rows.nth(1).getByRole('button', { name: /Mover «Tercera lectura»/ }).press('ArrowUp')
  await expect.poll(api.ids).toEqual([3, 1, 2])
  api.failRemoval()
  await rows.first().getByRole('button', { name: 'Quitar Tercera lectura de la lista' }).click()
  await expect(page.getByRole('alert')).toContainText('se restauró la lista')
  await expect(rows).toHaveCount(3)
  api.allowRemoval()
  await rows.first().getByRole('button', { name: 'Quitar Tercera lectura de la lista' }).click()
  await expect(rows).toHaveCount(2)
  await expect.poll(api.ids).toEqual([1, 2])
})
