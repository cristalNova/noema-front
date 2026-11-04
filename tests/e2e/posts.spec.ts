import { expect, test, type Page, type Route } from '@playwright/test'

const owner = { id: 7, name: 'María López', username: 'maria', profilePhoto: null }
const other = { id: 8, name: 'Ana Ruiz', username: 'ana', profilePhoto: null }

function makePost(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    ownerId: other.id,
    owner: other,
    communityId: null,
    articleId: null,
    article: null,
    parentPostId: null,
    postType: 'ORIGINAL',
    visibility: 'PUBLIC',
    content: `Publicación número ${id}`,
    likes: 3,
    repostCount: 0,
    commentCount: 1,
    createdAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  }
}

function tokenFor(userId = '7') {
  const payload = btoa(JSON.stringify({
    sub: userId,
    email: 'e2e@example.test',
    roles: [],
    permissions: [],
    exp: Math.floor(Date.now() / 1000) + 3600,
  }))
  return `header.${payload}.signature`
}

/** Deja pasar módulos y documentos de Vite: solo responde a las peticiones reales de la API. */
async function mockApi(page: Page, path: string, handler: (route: Route, url: URL) => Promise<void> | void) {
  await page.route(path, async (route) => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.fallback()
    await handler(route, new URL(route.request().url()))
  })
}

async function signIn(page: Page) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await mockApi(page, '**/profiles/me', (route) => route.fulfill({ json: owner }))
  await mockApi(page, '**/communities/mine**', (route) => route.fulfill({
    json: { data: [{ profileId: 7, communityId: 3, community: { id: 3, name: 'Club de ciencia' } }], total: 1, page: 1, limit: 100 },
  }))
}

async function mockAuthors(page: Page) {
  await mockApi(page, '**/profiles', (route) => route.fulfill({ json: [other, owner] }))
}

test.beforeEach(async ({ page }) => {
  await page.route('**/comments/**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
})

test('el feed pagina y filtra por autor conservando el filtro en la URL', async ({ page }) => {
  const requests: URL[] = []
  await mockAuthors(page)
  await mockApi(page, '**/posts?**', (route, url) => {
    requests.push(url)
    const current = Number(url.searchParams.get('page'))
    const authorId = url.searchParams.get('authorId')
    if (authorId) return route.fulfill({ json: { data: [makePost(30, { content: 'Solo de Ana' })], total: 1, page: 1, limit: 20 } })
    return route.fulfill({ json: { data: [makePost(current === 1 ? 1 : 21)], total: 21, page: current, limit: 20 } })
  })

  await page.goto('/')
  await page.getByRole('link', { name: 'Publicaciones', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sigue la conversación' })).toBeVisible()
  await expect(page.getByText('Publicación número 1', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('Publicación número 21')).toBeVisible()

  await page.getByLabel('Autor').selectOption(String(other.id))
  await expect(page.getByText('Solo de Ana')).toBeVisible()
  await expect(page).toHaveURL(/authorId=8/)
  await expect(page).not.toHaveURL(/page=/)
  expect(requests.at(-1)?.searchParams.get('authorId')).toBe('8')
  expect(requests.at(-1)?.searchParams.get('page')).toBe('1')

  await page.getByRole('link', { name: `Ver publicaciones de ${other.name}` }).click()
  await page.getByRole('button', { name: 'Quitar filtros' }).click()
  await expect(page).toHaveURL(/\/posts$/)
})

test('con sesión se filtra por una de mis comunidades; sin sesión se explica por qué no', async ({ page }) => {
  const seen: (string | null)[] = []
  await mockAuthors(page)
  await mockApi(page, '**/posts?**', (route, url) => {
    seen.push(url.searchParams.get('communityId'))
    return route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } })
  })

  await page.goto('/posts')
  await expect(page.getByLabel('Comunidad')).toBeDisabled()
  await expect(page.getByText('Inicia sesión para filtrar por tus comunidades.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'La conversación está por empezar.' })).toBeVisible()

  await signIn(page)
  await page.goto('/posts')
  await page.getByLabel('Comunidad').selectOption({ label: 'Club de ciencia' })
  await expect(page).toHaveURL(/communityId=3/)
  await expect(page.getByRole('heading', { name: 'Nada por aquí con estos filtros.' })).toBeVisible()
  expect(seen.at(-1)).toBe('3')
})

test('el compositor valida el límite, aplica comunidad y publica sin recargar', async ({ page }) => {
  await signIn(page)
  await mockAuthors(page)
  await mockApi(page, '**/articles/mine**', (route) => route.fulfill({
    json: { data: [{ id: 12, title: 'Ensayo sobre ciencia', status: 'PUBLISHED' }], total: 1, page: 1, limit: 100 },
  }))
  await mockApi(page, '**/posts?**', (route) => route.fulfill({
    json: { data: [makePost(1)], total: 1, page: 1, limit: 20 },
  }))
  let payload: Record<string, unknown> | null = null
  await mockApi(page, '**/posts', async (route) => {
    if (route.request().method() === 'POST') {
      payload = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({ json: makePost(2, { owner: owner, ownerId: owner.id, content: 'Una idea nueva', communityId: 3, articleId: 12 }) })
    }
    return route.fulfill({ json: { data: [makePost(1)], total: 1, page: 1, limit: 20 } })
  })

  await page.goto('/posts')
  const content = 'x'.repeat(2001)
  await page.getByLabel('Contenido de la publicación').fill(content)
  await expect(page.getByText('2001 / 2000')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar' })).toBeDisabled()
  await page.getByLabel('Contenido de la publicación').fill('Una idea nueva')
  await page.getByLabel('Espacio de publicación').selectOption('3')
  await expect(page.getByLabel('Audiencia de publicación')).toHaveValue('COMMUNITY')
  await page.getByLabel('Ensayo asociado').selectOption('12')
  await page.getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByText('Una idea nueva', { exact: true })).toBeVisible()
  expect(payload).toEqual({ postType: 'ORIGINAL', content: 'Una idea nueva', visibility: 'COMMUNITY', articleId: 12, communityId: 3 })
})

test('el feed sigue funcionando si fallan las opciones de filtro y permite reintentar si falla la lista', async ({ page }) => {
  let shouldFail = true
  await mockApi(page, '**/profiles', (route) => route.fulfill({ status: 500, json: { statusCode: 500, message: 'Error' } }))
  await mockApi(page, '**/posts?**', (route) => {
    if (shouldFail) return route.fulfill({ status: 500, json: { statusCode: 500, message: 'Fallo del servidor' } })
    return route.fulfill({ json: { data: [makePost(1)], total: 1, page: 1, limit: 20 } })
  })

  await page.goto('/posts')
  await expect(page.getByRole('alert')).toContainText('Fallo del servidor')
  await expect(page.getByText('No pudimos cargar todas las opciones de filtro.')).toBeVisible()
  shouldFail = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Publicación número 1', { exact: true })).toBeVisible()
})

test('el detalle muestra el post y sus respuestas paginadas', async ({ page }) => {
  await mockAuthors(page)
  await mockApi(page, '**/posts?**', (route) => route.fulfill({ json: { data: [makePost(1)], total: 1, page: 1, limit: 20 } }))
  await mockApi(page, '**/posts/1', (route) => route.fulfill({ json: makePost(1, { visibility: 'FOLLOWERS', content: 'El post abierto' }) }))
  await mockApi(page, '**/posts/1/replies**', (route, url) => {
    const current = Number(url.searchParams.get('page'))
    const reply = makePost(current === 1 ? 2 : 3, { postType: 'REPLY', parentPostId: 1, content: `Respuesta de la página ${current}` })
    return route.fulfill({ json: { data: [reply], total: 21, page: current, limit: 20 } })
  })

  await page.goto('/posts')
  await page.getByRole('link', { name: `Abrir la publicación de ${other.name}` }).click()
  await expect(page).toHaveURL(/\/posts\/1$/)
  await expect(page.getByText('El post abierto')).toBeVisible()
  await expect(page.getByText('Solo seguidores')).toBeVisible()
  await expect(page.getByText('Respuesta de la página 1')).toBeVisible()

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('Respuesta de la página 2')).toBeVisible()
  await expect(page.getByText('El post abierto')).toBeVisible()
})

test('un post sin acceso o inexistente se muestra como no disponible', async ({ page }) => {
  await mockApi(page, '**/posts/99', (route) => route.fulfill({ status: 404, json: { statusCode: 404, message: 'Post no encontrado' } }))
  await mockApi(page, '**/posts/99/replies**', (route) => route.fulfill({ status: 404, json: { statusCode: 404, message: 'Post no encontrado' } }))

  await page.goto('/posts/99')
  await expect(page.getByRole('heading', { name: 'Esta publicación no está disponible' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
  await expect(page.getByText('Post no encontrado')).toHaveCount(0)
})

test('"Mis posts" exige sesión', async ({ page }) => {
  await mockAuthors(page)
  await mockApi(page, '**/posts?**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } }))
  await page.goto('/posts')
  await page.getByRole('link', { name: 'Mis posts' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('"Mis posts" elimina solo tras confirmar y vuelve a una página válida', async ({ page }) => {
  let posts = [makePost(41, { ownerId: 7, owner, postType: 'REPOST', content: null, parentPostId: 5 })]
  const firstPage = Array.from({ length: 20 }, (_, index) => makePost(index + 1, { ownerId: 7, owner }))
  const deleted: number[] = []
  await signIn(page)
  await mockApi(page, '**/posts/mine**', (route, url) => {
    const current = Number(url.searchParams.get('page'))
    const total = 20 + posts.length
    return route.fulfill({ json: { data: current === 1 ? firstPage : posts, total, page: current, limit: 20 } })
  })
  await mockApi(page, '**/posts/41', (route) => {
    deleted.push(41)
    posts = []
    return route.fulfill({ status: 204 })
  })

  await page.goto('/app/posts?page=2')
  await expect(page.getByRole('heading', { name: 'Mis posts' })).toBeVisible()
  await expect(page.getByText('Republicó una publicación.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver original' })).toHaveAttribute('href', '/posts/5')

  await page.getByRole('button', { name: 'Eliminar' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Eliminar publicación?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  expect(deleted).toEqual([])

  await page.getByRole('button', { name: 'Eliminar' }).click()
  await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click()
  await expect(page.getByText('Se eliminó tu publicación.')).toBeVisible()
  expect(deleted).toEqual([41])
  await expect(page).not.toHaveURL(/page=/)
  await expect(page.getByText('Publicación número 1', { exact: true })).toBeVisible()
})

test('un error al eliminar se muestra en el diálogo y no quita el post', async ({ page }) => {
  await signIn(page)
  await mockApi(page, '**/posts/mine**', (route) => route.fulfill({
    json: { data: [makePost(50, { ownerId: 7, owner })], total: 1, page: 1, limit: 20 },
  }))
  await mockApi(page, '**/posts/50', (route) => route.fulfill({ status: 500, json: { statusCode: 500, message: 'No se pudo eliminar' } }))

  await page.goto('/app/posts')
  await page.getByRole('button', { name: 'Eliminar' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('No se pudo eliminar')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByText('Publicación número 50')).toBeVisible()
})
