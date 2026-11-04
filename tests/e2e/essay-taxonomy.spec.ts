import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 8, username: 'autor', name: 'Autor', isVerified: false, followersCount: 0 }
const content = 'Hay ideas que solo aparecen cuando hacemos una pausa.'
const collections = [
  { id: 1, authorId: 8, title: 'Serie A', description: 'Primera serie' },
  { id: 2, authorId: 8, title: 'Serie B', description: 'Segunda serie' },
]
const catalog = [{ tag: 'filosofia', articles: 3 }, { tag: 'ciencia', articles: 1 }]

function token() {
  return `header.${btoa(JSON.stringify({ sub: '8', email: 'e2e@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
}
async function api(page: Page, match: (pathname: string) => boolean, handler: (route: Route) => void | Promise<void>) {
  await page.route((url) => match(url.pathname), (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    return handler(route)
  })
}

interface Calls { articles: { method: string; body: Record<string, unknown> | null }[]; tags: string[][] }

async function setup(page: Page, options: { collections?: unknown[]; existing?: Record<string, unknown> } = {}) {
  const calls: Calls = { articles: [], tags: [] }
  await page.addInitScript((value) => localStorage.setItem('noema.access_token', value), token())
  await api(page, (p) => p.endsWith('/profiles/me'), (route) => route.fulfill({ json: profile }))
  await api(page, (p) => p.endsWith('/communities/mine'), (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  await api(page, (p) => p.endsWith('/collections'), (route) => route.fulfill({ json: options.collections ?? collections }))
  await api(page, (p) => p === '/article-tags', (route) => route.fulfill({ json: catalog }))
  await api(page, (p) => p.startsWith('/article-tags/article/'), (route) => {
    const { tags } = route.request().postDataJSON() as { tags: string[] }
    calls.tags.push(tags)
    // El backend normaliza y devuelve las etiquetas ordenadas.
    return route.fulfill({ json: [...new Set(tags.map((tag) => tag.trim().toLowerCase()))].sort() })
  })
  await api(page, (p) => p.startsWith('/articles'), (route) => {
    const request = route.request()
    const method = request.method()
    if (method === 'GET') return route.fulfill({ json: options.existing ?? {} })
    const body = request.postDataJSON() as Record<string, unknown>
    calls.articles.push({ method, body })
    return route.fulfill({ status: method === 'POST' ? 201 : 200, json: { id: 9, status: 'DRAFT', content, communityId: null, ...body } })
  })
  return calls
}

test('asigna etiquetas con búsqueda y una colección con posición al guardar', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/app/articles/new')
  await page.locator('#title').fill('Un ensayo ordenado')
  await page.locator('.draft-content').fill(content)

  const tags = page.locator('#tags')
  await tags.fill('fil')
  await expect(page.getByRole('option', { name: /#filosofia/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /#ciencia/ })).toBeHidden()
  await page.getByRole('option', { name: /#filosofia/ }).click()
  await tags.fill('cien')
  await tags.press('ArrowDown')
  await tags.press('Enter')
  await tags.fill('Nueva  Idea')
  await expect(page.getByRole('option', { name: /Crear “nueva idea”/ })).toBeVisible()
  await tags.press('Enter')

  const chips = page.getByRole('list', { name: 'Etiquetas seleccionadas' })
  await expect(chips.getByRole('listitem')).toHaveText(['#filosofia×', '#ciencia×', '#nueva idea×'])
  await page.getByRole('button', { name: 'Quitar etiqueta ciencia' }).click()
  await expect(chips.getByRole('listitem')).toHaveCount(2)

  // La posición solo aparece cuando hay una colección elegida.
  await expect(page.locator('#collectionPosition')).toHaveCount(0)
  await page.locator('#collectionId').selectOption({ label: 'Serie A' })
  await page.locator('#collectionPosition').fill('2')
  await page.getByRole('button', { name: 'Guardar borrador' }).click()

  await expect(page.getByRole('button', { name: 'Cambios guardados' })).toBeVisible()
  expect(calls.articles).toHaveLength(1)
  expect(calls.articles[0].body).toMatchObject({ title: 'Un ensayo ordenado', collectionId: 1, collectionPosition: 2 })
  // Las etiquetas no van en el body del ensayo (el backend rechaza campos desconocidos).
  expect(calls.articles[0].body).not.toHaveProperty('tags')
  expect(calls.tags).toEqual([['filosofia', 'nueva idea']])
  await expect(chips.getByRole('listitem')).toHaveText(['#filosofia×', '#nueva idea×'])
})

test('sin colecciones ofrece un acceso directo para crear una', async ({ page }) => {
  await setup(page, { collections: [] })
  await page.goto('/app/articles/new')
  const link = page.getByRole('link', { name: 'Crear una colección' })
  await expect(link).toHaveAttribute('href', '/app/collections/new')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(page.locator('#collectionPosition')).toHaveCount(0)
})

test('al editar carga etiquetas y colección y guarda solo los cambios de etiquetas', async ({ page }) => {
  const calls = await setup(page, { existing: {
    id: 5, authorId: 8, title: 'Ensayo existente', description: '', content, isPremium: false, communityId: null,
    status: 'DRAFT', collectionId: 2, collectionPosition: 3, collection: { id: 2, title: 'Serie B' },
    articleTags: [{ articleId: 5, tag: 'ideas' }, { articleId: 5, tag: 'arte' }],
  } })
  await page.goto('/app/articles/5/edit')
  const chips = page.getByRole('list', { name: 'Etiquetas seleccionadas' })
  await expect(chips.getByRole('listitem')).toHaveText(['#arte×', '#ideas×'])
  await expect(page.locator('#collectionId')).toHaveValue('2')
  await expect(page.locator('#collectionPosition')).toHaveValue('3')

  await page.getByRole('button', { name: 'Quitar etiqueta arte' }).click()
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('button', { name: 'Cambios guardados' })).toBeVisible()
  expect(calls.articles[0]).toMatchObject({ method: 'PATCH', body: { collectionId: 2, collectionPosition: 3 } })
  expect(calls.tags).toEqual([['ideas']])
})

test('valida la posición antes de enviar', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/app/articles/new')
  await page.locator('#title').fill('Un ensayo ordenado')
  await page.locator('.draft-content').fill(content)
  await page.locator('#collectionId').selectOption({ label: 'Serie B' })
  await page.locator('#collectionPosition').fill('0')
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'al menos 1' })).toBeVisible()
  expect(calls.articles).toHaveLength(0)
})
