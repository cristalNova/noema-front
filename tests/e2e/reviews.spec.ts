import { expect, test, type Page, type Route } from '@playwright/test'

const me = { id: 8, userId: 8, username: 'lector', name: 'Lector Uno', isVerified: false, followersCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }

const essay = {
  id: 5, authorId: 7, title: 'Un ensayo', description: '', content: 'El texto del ensayo.', isPremium: false, locked: false,
  status: 'PUBLISHED', communityId: null, publishedAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
}

function makeReview(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id, profileId: 9, profile: { id: 9, username: 'eva', name: 'Eva Paz' }, articleId: 5, rating: 4,
    reviewText: `Reseña ${id}`, createdAt: '2026-11-02T12:00:00.000Z', ...overrides,
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

async function signIn(page: Page, hasProfile = true, profile = me) {
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), tokenFor(String(profile.userId)))
  await mockApi(page, '**/profiles/me', (route) => hasProfile
    ? route.fulfill({ json: profile })
    : route.fulfill({ status: 404, json: { statusCode: 404, message: 'Perfil no encontrado' } }))
}

async function mockEssay(page: Page, reviews: unknown[], article: unknown = essay) {
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: article }))
  await mockApi(page, '**/comments/article/5**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  await mockApi(page, '**/reviews/article/5', (route) => route.fulfill({ json: reviews }))
}

const stars = (page: Page, value: number) => page.getByRole('radio', { name: `${value} de 5 estrellas` })

test('al final del ensayo se ven las reseñas con su promedio y el formulario con calificación obligatoria', async ({ page }) => {
  const bodies: Record<string, unknown>[] = []
  await signIn(page)
  await mockEssay(page, [makeReview(1, { rating: 5 }), makeReview(2, { rating: 4, profileId: 10, profile: { id: 10, username: 'ivo', name: 'Ivo Gil' } })])
  await mockApi(page, '**/reviews', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    bodies.push(body)
    return route.fulfill({ status: 201, json: makeReview(30, { profileId: me.id, profile: undefined, rating: body.rating, reviewText: body.reviewText ?? null }) })
  })
  await page.goto('/articles/5')

  await expect(page.getByRole('heading', { name: 'Reseñas' })).toBeVisible()
  await expect(page.getByText('2 reseñas')).toBeVisible()
  await expect(page.getByText('4,5', { exact: true })).toBeVisible()

  const submit = page.getByRole('button', { name: 'Publicar reseña' })
  await submit.click()
  await expect(page.getByRole('alert')).toContainText('Elige una calificación')
  expect(bodies).toHaveLength(0)

  // El texto es opcional: solo con calificación se publica.
  await stars(page, 3).check()
  await submit.click()
  await expect(page.getByText('Ya reseñaste este ensayo')).toBeVisible()
  expect(bodies).toEqual([{ articleId: 5, rating: 3 }])
  await expect(page.getByText('3 reseñas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar reseña' })).toHaveCount(0)
})

test('se publica con texto y aparece junto a las demás sin recargar', async ({ page }) => {
  const bodies: Record<string, unknown>[] = []
  await signIn(page)
  await mockEssay(page, [makeReview(1)])
  await mockApi(page, '**/reviews', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    bodies.push(body)
    return route.fulfill({ status: 201, json: makeReview(31, { profileId: me.id, profile: undefined, rating: body.rating, reviewText: body.reviewText }) })
  })
  await page.goto('/articles/5')

  await stars(page, 5).check()
  await page.getByRole('textbox', { name: 'Tu reseña (opcional)' }).fill('  Muy buen ensayo  ')
  await page.getByRole('button', { name: 'Publicar reseña' }).click()

  await expect(page.getByText('Muy buen ensayo')).toBeVisible()
  expect(bodies).toEqual([{ articleId: 5, rating: 5, reviewText: 'Muy buen ensayo' }])
  await expect(page.getByText('Lector Uno (tú)')).toBeVisible()
})

test('si ya reseñé, no se ofrece otra y se puede editar la existente', async ({ page }) => {
  const patches: Record<string, unknown>[] = []
  let posts = 0
  await signIn(page)
  await mockEssay(page, [makeReview(1), makeReview(2, { profileId: me.id, profile: me, rating: 2, reviewText: 'Regular' })])
  await mockApi(page, '**/reviews', (route) => {
    posts += 1
    return route.fulfill({ status: 409, json: { statusCode: 409, message: 'Ya reseñaste este artículo' } })
  })
  await mockApi(page, '**/reviews/2', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    patches.push(body)
    return route.fulfill({ json: makeReview(2, { profileId: me.id, profile: undefined, rating: body.rating, reviewText: body.reviewText }) })
  })
  await page.goto('/articles/5')

  await expect(page.getByRole('button', { name: 'Publicar reseña' })).toHaveCount(0)
  await expect(page.getByText('Ya reseñaste este ensayo')).toBeVisible()

  await page.getByRole('button', { name: 'Editar mi reseña' }).click()
  await expect(stars(page, 2)).toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Tu reseña (opcional)' })).toHaveValue('Regular')
  await stars(page, 4).check()
  await page.getByRole('textbox', { name: 'Tu reseña (opcional)' }).fill('')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()

  await expect(page.getByRole('button', { name: 'Editar mi reseña' })).toBeVisible()
  expect(patches).toEqual([{ rating: 4, reviewText: '' }])
  expect(posts).toBe(0)
  await expect(page.getByText('Regular')).toHaveCount(0)
})

test('un visitante ve las reseñas y al intentar reseñar se le pide iniciar sesión', async ({ page }) => {
  let writes = 0
  await mockEssay(page, [makeReview(1)])
  await page.route('**/reviews', (route) => {
    writes += 1
    return route.fulfill({ status: 201, json: makeReview(2) })
  })
  await page.goto('/articles/5')

  await expect(page.getByText('Reseña 1', { exact: true })).toBeVisible()
  const prompt = page.getByRole('dialog', { name: 'Inicia sesión para continuar' })

  await stars(page, 4).click({ force: true })
  await expect(prompt).toContainText('reseñar este ensayo')
  await prompt.getByRole('button', { name: 'Ahora no' }).click()
  await expect(stars(page, 4)).not.toBeChecked()

  await page.getByRole('button', { name: 'Publicar reseña' }).click()
  await expect(prompt).toBeVisible()
  await prompt.getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(writes).toBe(0)
})

test('quien tiene sesión pero no perfil es dirigido a crearlo', async ({ page }) => {
  await signIn(page, false)
  await mockEssay(page, [])
  await page.goto('/articles/5')

  // Se le redirige desde la primera interacción, antes de que escriba nada que se pierda.
  await stars(page, 5).click({ force: true })
  await expect(page).toHaveURL(/\/profile\/new$/)
})

test('el autor no ve el formulario en su propio ensayo', async ({ page }) => {
  await signIn(page, true, { ...me, id: 7, userId: 7, username: 'ana', name: 'Ana Ruiz' })
  await mockEssay(page, [makeReview(1)])
  await page.goto('/articles/5')

  await expect(page.getByText('Reseña 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Este es tu ensayo')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar reseña' })).toHaveCount(0)
})

test('si otra pestaña ya reseñó, el 409 recarga y ofrece editar', async ({ page }) => {
  let listed = 0
  await signIn(page)
  await mockApi(page, '**/articles/5', (route) => route.fulfill({ json: essay }))
  await mockApi(page, '**/comments/article/5**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
  await mockApi(page, '**/reviews/article/5', (route) => {
    listed += 1
    return route.fulfill({ json: listed === 1 ? [] : [makeReview(3, { profileId: me.id, profile: me, rating: 5, reviewText: 'Desde otra pestaña' })] })
  })
  await mockApi(page, '**/reviews', (route) => route.fulfill({ status: 409, json: { statusCode: 409, message: 'Ya reseñaste este artículo' } }))
  await page.goto('/articles/5')

  await stars(page, 2).check()
  await page.getByRole('button', { name: 'Publicar reseña' }).click()
  await expect(page.getByText('Desde otra pestaña')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar mi reseña' })).toBeVisible()
})
