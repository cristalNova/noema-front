import { expect, test, type Page } from '@playwright/test'
import { mockBackgroundApis } from './support'

test.beforeEach(({ page }) => mockBackgroundApis(page))

const phrase = 'Esta idea merece una segunda lectura.'
const content = `${'Un párrafo largo para probar el desplazamiento y la lectura.\n\n'.repeat(55)}${phrase}\n\nUna conclusión para cerrar.`
const article = {
  id: 42, authorId: 7, author: { id: 7, name: 'Ana Pérez', username: 'ana' }, title: 'Un ensayo sobre ideas',
  description: 'Texto de prueba', content, status: 'PUBLISHED', locked: false,
  isPremium: false, communityId: null, publishedAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z', articleTags: [],
}

async function signIn(page: Page) {
  const payload = btoa(JSON.stringify({ sub: 2, email: 'reader@example.test', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600 }))
  await page.addInitScript((token) => localStorage.setItem('noema.access_token', token), `header.${payload}.signature`)
  await page.route('**/profiles/me', (route) => route.fulfill({ json: { id: 2, username: 'lector', name: 'Lector' } }))
}

async function mockArticle(page: Page) {
  await page.route('**/articles/42', (route) => route.request().resourceType() === 'document'
    ? route.fallback() : route.fulfill({ json: article }))
  await page.route('**/comments/article/42**', (route) => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 100 } }))
}

test('selecciona, guarda, abre el subrayado, edita la nota y elimina con confirmación', async ({ page }) => {
  await signIn(page)
  await mockArticle(page)
  let bookmarks: Array<Record<string, unknown>> = []
  await page.route((url) => url.pathname === '/bookmarks' || url.pathname === '/bookmarks/8', (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      const input = request.postDataJSON() as Record<string, unknown>
      expect(input.highlightedText).toBe(phrase)
      expect(input.startPosition).toBe(content.indexOf(phrase))
      expect(input.endPosition).toBe(content.indexOf(phrase) + phrase.length)
      bookmarks = [{ ...input, id: 8, article, createdAt: '2026-11-01T12:00:00.000Z' }]
      return route.fulfill({ status: 201, json: bookmarks[0] })
    }
    if (request.method() === 'PATCH') {
      bookmarks = [{ ...bookmarks[0], ...request.postDataJSON() as object }]
      return route.fulfill({ json: bookmarks[0] })
    }
    if (request.method() === 'DELETE') { bookmarks = []; return route.fulfill({ status: 204, body: '' }) }
    const url = new URL(request.url())
    const data = url.searchParams.has('articleId') ? bookmarks.filter((item) => item.articleId === 42) : bookmarks
    return route.fulfill({ json: { data, total: data.length, page: 1, limit: 10 } })
  })

  await page.goto('/articles/42')
  await expect(page.getByRole('heading', { name: article.title })).toBeVisible()
  await page.locator('.article-reader__content').evaluate((element, value) => {
    const node = element.firstChild!
    const text = node.textContent!
    const start = text.indexOf(value)
    const range = document.createRange()
    range.setStart(node, start)
    range.setEnd(node, start + value.length)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  }, phrase)
  await page.getByRole('button', { name: 'Guardar marcador' }).click()
  await page.getByRole('textbox', { name: 'Nota (opcional)' }).fill('Conecta con el tema central.')
  await page.getByRole('button', { name: 'Guardar marcador' }).click()
  await expect(page.locator('mark[data-bookmark-ids~="8"]')).toHaveText(phrase)

  await page.goto('/app/bookmarks')
  await expect(page.getByText('Conecta con el tema central.')).toBeVisible()
  await page.getByRole('link', { name: 'Abrir fragmento' }).click()
  await expect(page).toHaveURL(/\/articles\/42\?bookmark=8$/)
  await expect(page.locator('mark[data-bookmark-ids~="8"]')).toBeInViewport()

  await page.goto('/app/bookmarks')
  await page.getByRole('button', { name: 'Editar nota' }).click()
  await page.getByRole('textbox', { name: 'Nota', exact: true }).fill('Nota corregida.')
  await page.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(page.getByText('Nota corregida.')).toBeVisible()
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Nota corregida.')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByRole('heading', { name: 'Aún no tienes marcadores.' })).toBeVisible()
})

test('el listado pagina y vuelve al anterior al borrar el último', async ({ page }) => {
  await signIn(page)
  let items = Array.from({ length: 11 }, (_, index) => ({ id: index + 1, articleId: 42, article, highlightedText: `Idea ${index + 1}`, startPosition: 0, endPosition: 6, createdAt: '2026-11-01T12:00:00.000Z' }))
  await page.route((url) => url.pathname === '/bookmarks' || url.pathname === '/bookmarks/11', (route) => {
    if (route.request().method() === 'DELETE') { items = items.filter((item) => item.id !== 11); return route.fulfill({ status: 204, body: '' }) }
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') ?? 1)
    return route.fulfill({ json: { data: items.slice((pageNumber - 1) * 10, pageNumber * 10), total: items.length, page: pageNumber, limit: 10 } })
  })
  await page.goto('/app/bookmarks')
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(page.getByText('Idea 11')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Página 1 de 1')).toBeVisible()
  await expect(page.getByText('«Idea 1»', { exact: true })).toBeVisible()
})
