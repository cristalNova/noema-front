import { expect, test, type Page, type Route } from '@playwright/test'

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }
const ana = { id: 7, username: 'ana', name: 'Ana Ruiz' }

const essay = {
  id: 5, authorId: 7, title: 'Un ensayo', description: '', content: 'El texto del ensayo.', isPremium: false, locked: false,
  status: 'PUBLISHED', communityId: null, publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
}

function makeComment(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id, authorId: ana.id, author: ana, articleId: 5, postId: null, parentCommentId: null, content: `Comentario ${id}`,
    createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', ...overrides,
  }
}

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

async function signIn(page: Page, hasProfile = true) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor())
  await mockApi(page, '**/profiles/me', (route) => hasProfile
    ? route.fulfill({ json: me })
    : route.fulfill({ status: 404, json: { statusCode: 404, message: 'Perfil no encontrado' } }))
}

async function mockEssay(page: Page, comments: unknown[], article: unknown = essay) {
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: article }))
  await mockApi(page, '**/articles/mine/5', (route) => route.fulfill({ json: article }))
  await mockApi(page, '**/comments/article/5**', (route) => route.fulfill({ json: { data: comments, total: comments.length, page: 1, limit: 100 } }))
}

const threads = (page: Page) => page.getByRole('list', { name: 'Comentarios', exact: true })

test('las respuestas aparecen indentadas bajo su padre aunque lleguen en otra página de la API', async ({ page }) => {
  const seenPages: (string | null)[] = []
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: essay }))
  await mockApi(page, '**/comments/article/5**', (route, url) => {
    const current = url.searchParams.get('page')
    seenPages.push(current)
    const data = current === '1'
      ? [makeComment(1, { content: 'Comentario padre' }), makeComment(2, { content: 'Otro principal' })]
      : [makeComment(3, { parentCommentId: 1, author: { ...ana, id: 9, name: 'Eva Paz' }, authorId: 9, content: 'Respuesta de Eva' }), makeComment(4, { parentCommentId: 3, content: 'Respuesta a la respuesta' })]
    return route.fulfill({ json: { data, total: 102, page: Number(current), limit: 100 } })
  })

  await page.goto('/articles/5')
  await expect(page.getByRole('heading', { name: 'Comentarios' })).toBeVisible()
  await expect(page.getByText('4 comentarios')).toBeVisible()

  const repliesToAna = threads(page).getByRole('list', { name: 'Respuestas a Ana Ruiz' }).first()
  await expect(repliesToAna).toContainText('Respuesta de Eva')
  await expect(repliesToAna.getByRole('list', { name: 'Respuestas a Eva Paz' })).toContainText('Respuesta a la respuesta')
  await expect(threads(page).locator(':scope > li')).toHaveCount(2)

  const parentBox = await page.getByText('Comentario padre', { exact: true }).boundingBox()
  const replyBox = await page.getByText('Respuesta de Eva', { exact: true }).boundingBox()
  expect(replyBox!.x).toBeGreaterThan(parentBox!.x)
  expect(seenPages).toEqual(['1', '2'])
})

test('pagina por hilos: una respuesta no ocupa lugar ni se separa de su padre', async ({ page }) => {
  const comments = [
    ...Array.from({ length: 11 }, (_, index) => makeComment(index + 1)),
    makeComment(50, { parentCommentId: 1, content: 'Respuesta al primero' }),
  ]
  await mockEssay(page, comments)
  await page.goto('/articles/5')

  await expect(page.getByText('12 comentarios')).toBeVisible()
  await expect(threads(page).locator(':scope > li')).toHaveCount(10)
  await expect(page.getByText('Respuesta al primero')).toBeVisible()
  await expect(page.getByText('Comentario 11', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/commentsPage=2/)
  await expect(page.getByText('Comentario 11', { exact: true })).toBeVisible()
  await expect(threads(page).locator(':scope > li')).toHaveCount(1)
  await expect(page.getByText('Respuesta al primero')).toHaveCount(0)
})

test('un visitante lee los comentarios y al intentar comentar se le pide iniciar sesión', async ({ page }) => {
  let writes = 0
  await mockEssay(page, [makeComment(1)])
  await page.route('**/comments', (route) => {
    writes += 1
    return route.fulfill({ status: 201, json: makeComment(2) })
  })
  await page.goto('/articles/5')

  await expect(page.getByText('Comentario 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Escribe un comentario' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Editar|Eliminar/ })).toHaveCount(0)

  const prompt = page.getByRole('dialog', { name: 'Inicia sesión para continuar' })
  await page.getByRole('button', { name: 'Comentar', exact: true }).click()
  await expect(prompt).toContainText('comentar')
  await prompt.getByRole('button', { name: 'Ahora no' }).click()

  await page.getByRole('button', { name: 'Responder a Ana Ruiz' }).click()
  await expect(prompt).toContainText('responder a este comentario')
  await expect(page.getByRole('textbox', { name: 'Responde a Ana Ruiz' })).toHaveCount(0)
  await prompt.getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(writes).toBe(0)
})

test('con sesión se comenta y se responde sin recargar, y la respuesta queda bajo su padre', async ({ page }) => {
  const bodies: Record<string, unknown>[] = []
  let gets = 0
  await signIn(page)
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: essay }))
  await mockApi(page, '**/comments/article/5**', (route) => {
    gets += 1
    return route.fulfill({ json: { data: [makeComment(1)], total: 1, page: 1, limit: 100 } })
  })
  await mockApi(page, '**/comments', (route) => {
    const body = route.request().postDataJSON()
    bodies.push(body)
    // Como el backend real: la respuesta no incluye la relación author.
    return route.fulfill({ status: 201, json: {
      id: 100 + bodies.length, authorId: me.id, articleId: 5, postId: null, parentCommentId: body.parentCommentId ?? null,
      content: body.content, createdAt: '2026-11-03T12:00:00.000Z', updatedAt: '2026-11-03T12:00:00.000Z',
    } })
  })
  await page.goto('/articles/5')

  const composer = page.getByRole('textbox', { name: 'Escribe un comentario' })
  await expect(page.getByRole('button', { name: 'Comentar', exact: true })).toBeDisabled()
  await composer.fill('   ')
  await expect(page.getByRole('button', { name: 'Comentar', exact: true })).toBeDisabled()
  await composer.fill('  Mi comentario  ')
  await page.getByRole('button', { name: 'Comentar', exact: true }).click()
  await expect(threads(page)).toContainText('Mi comentario')
  await expect(threads(page)).toContainText(me.name)
  await expect(composer).toHaveValue('')

  await page.getByRole('button', { name: 'Responder a Ana Ruiz' }).click()
  await page.getByRole('textbox', { name: 'Responde a Ana Ruiz' }).fill('Mi respuesta')
  await page.getByRole('button', { name: 'Responder', exact: true }).click()
  await expect(page.getByRole('list', { name: 'Respuestas a Ana Ruiz' })).toContainText('Mi respuesta')
  await expect(page.getByRole('textbox', { name: 'Responde a Ana Ruiz' })).toHaveCount(0)

  expect(bodies).toEqual([{ content: 'Mi comentario', articleId: 5 }, { content: 'Mi respuesta', parentCommentId: 1 }])
  expect(gets).toBe(1)
})

test('un comentario nuevo lleva a la última página, donde queda', async ({ page }) => {
  await signIn(page)
  await mockEssay(page, Array.from({ length: 10 }, (_, index) => makeComment(index + 1)))
  await mockApi(page, '**/comments', (route) => route.fulfill({ status: 201, json: makeComment(200, { authorId: me.id, author: undefined, content: 'El undécimo' }) }))
  await page.goto('/articles/5')

  await page.getByRole('textbox', { name: 'Escribe un comentario' }).fill('El undécimo')
  await page.getByRole('button', { name: 'Comentar', exact: true }).click()
  await expect(page).toHaveURL(/commentsPage=2/)
  await expect(threads(page)).toContainText('El undécimo')
})

test('solo mis comentarios se pueden editar, y un error conserva el texto', async ({ page }) => {
  const patches: unknown[] = []
  await signIn(page)
  await mockEssay(page, [makeComment(1), makeComment(2, { authorId: me.id, author: me, content: 'Texto original' })])
  await mockApi(page, '**/comments/2', (route) => {
    patches.push(route.request().postDataJSON())
    return patches.length === 1
      ? route.fulfill({ status: 500, json: { statusCode: 500, message: 'No se pudo guardar' } })
      : route.fulfill({ json: { ...makeComment(2, { authorId: me.id }), content: 'Texto corregido', updatedAt: '2026-11-03T12:00:00.000Z' } })
  })
  await page.goto('/articles/5')

  await expect(page.getByRole('button', { name: 'Editar mi comentario' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Eliminar mi comentario' })).toHaveCount(1)

  const editor = page.getByRole('textbox', { name: 'Edita tu comentario' })
  await page.getByRole('button', { name: 'Editar mi comentario' }).click()
  await editor.fill('Descartado')
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByText('Texto original')).toBeVisible()
  expect(patches).toEqual([])

  await page.getByRole('button', { name: 'Editar mi comentario' }).click()
  await editor.fill('Texto corregido')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('alert')).toHaveText('No se pudo guardar')
  await expect(editor).toHaveValue('Texto corregido')

  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Texto corregido', { exact: true })).toBeVisible()
  await expect(threads(page)).toContainText('editado')
  expect(patches).toEqual([{ content: 'Texto corregido' }, { content: 'Texto corregido' }])
})

test('eliminar pide confirmación, avisa de las respuestas y quita todo el hilo', async ({ page }) => {
  const deleted: string[] = []
  await signIn(page)
  await mockEssay(page, [
    makeComment(1, { authorId: me.id, author: me, content: 'Mi hilo' }),
    makeComment(2, { parentCommentId: 1, content: 'Respuesta uno' }),
    makeComment(3, { parentCommentId: 2, content: 'Respuesta dos' }),
    makeComment(4, { content: 'Otro hilo' }),
  ])
  await mockApi(page, '**/comments/1', (route, url) => {
    deleted.push(url.pathname)
    return route.fulfill({ status: 204 })
  })
  await page.goto('/articles/5')

  const dialog = page.getByRole('dialog', { name: '¿Eliminar comentario?' })
  await page.getByRole('button', { name: 'Eliminar mi comentario' }).click()
  await expect(dialog).toContainText('También se eliminarán sus 2 respuestas.')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  expect(deleted).toEqual([])

  await page.getByRole('button', { name: 'Eliminar mi comentario' }).click()
  await dialog.getByRole('button', { name: 'Eliminar definitivamente' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Mi hilo')).toHaveCount(0)
  await expect(page.getByText('Respuesta dos')).toHaveCount(0)
  await expect(page.getByText('Otro hilo')).toBeVisible()
  await expect(page.getByText('1 comentario', { exact: true })).toBeVisible()
  expect(deleted).toEqual(['/comments/1'])
})

test('un error al comentar se muestra y conserva lo escrito', async ({ page }) => {
  await signIn(page)
  await mockEssay(page, [])
  await mockApi(page, '**/comments', (route) => route.fulfill({ status: 500, json: { statusCode: 500, message: 'Fallo del servidor' } }))
  await page.goto('/articles/5')

  await expect(page.getByText('Todavía no hay comentarios.')).toBeVisible()
  const composer = page.getByRole('textbox', { name: 'Escribe un comentario' })
  await composer.fill('No quiero perder esto')
  await page.getByRole('button', { name: 'Comentar', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Fallo del servidor')
  await expect(composer).toHaveValue('No quiero perder esto')
})

test('un fallo al cargar permite reintentar', async ({ page }) => {
  let shouldFail = true
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: essay }))
  await mockApi(page, '**/comments/article/5**', (route) => shouldFail
    ? route.fulfill({ status: 500, json: { statusCode: 500, message: 'Fallo del servidor' } })
    : route.fulfill({ json: { data: [makeComment(1)], total: 1, page: 1, limit: 100 } }))
  await page.goto('/articles/5')

  await expect(page.getByRole('alert')).toContainText('Fallo del servidor')
  shouldFail = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Comentario 1', { exact: true })).toBeVisible()
})

test('los posts también tienen comentarios y se publican contra el post', async ({ page }) => {
  const bodies: unknown[] = []
  const post = { id: 1, ownerId: 7, owner: ana, communityId: null, postType: 'ORIGINAL', visibility: 'PUBLIC', content: 'El post', likes: 0, repostCount: 0, commentCount: 0, createdAt: '2026-11-01T12:00:00.000Z' }
  await signIn(page)
  await mockApi(page, '**/posts/1', (route) => route.fulfill({ json: post }))
  await mockApi(page, '**/posts/1/replies**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 20 } }))
  await mockApi(page, '**/comments/post/1**', (route) => route.fulfill({ json: { data: [makeComment(1, { articleId: null, postId: 1, content: 'Sobre el post' })], total: 1, page: 1, limit: 100 } }))
  await mockApi(page, '**/comments', (route) => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ status: 201, json: makeComment(2, { articleId: null, postId: 1, authorId: me.id, author: undefined, content: 'Mi opinión' }) })
  })
  await page.goto('/posts/1')

  await expect(page.getByText('Sobre el post')).toBeVisible()
  await page.getByRole('textbox', { name: 'Escribe un comentario' }).fill('Mi opinión')
  await page.getByRole('button', { name: 'Comentar', exact: true }).click()
  await expect(threads(page)).toContainText('Mi opinión')
  expect(bodies).toEqual([{ content: 'Mi opinión', postId: 1 }])
})

test('quien aún no tiene perfil lo crea antes de comentar', async ({ page }) => {
  await signIn(page, false)
  await mockEssay(page, [makeComment(1)])
  await page.goto('/articles/5')
  await expect(page.getByText('Crea tu perfil para unirte a la conversación.')).toBeVisible()
  await page.getByRole('button', { name: 'Comentar', exact: true }).click()
  await expect(page).toHaveURL(/\/profile\/new$/)
})

test('un borrador propio no muestra comentarios ni los pide', async ({ page }) => {
  let requests = 0
  await signIn(page)
  await mockApi(page, '**/articles/mine/5', (route) => route.fulfill({ json: { ...essay, status: 'DRAFT', publishedAt: null } }))
  await mockApi(page, '**/comments/article/5**', (route) => {
    requests += 1
    return route.fulfill({ status: 404, json: { statusCode: 404, message: 'No encontrado' } })
  })
  await page.goto('/app/articles/5')
  await expect(page.getByText('El texto del ensayo.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Comentarios' })).toHaveCount(0)
  expect(requests).toBe(0)
})
