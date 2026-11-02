import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function moduleUrl(path, replacements = []) {
  let source = readFileSync(new URL(path, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}

const { selectArticles, STATUS_TRANSITIONS } = await import(moduleUrl('../src/features/articles/model/myArticles.ts'))
const fixtures = Array.from({ length: 113 }, (_, index) => ({
  id: index + 1, title: `Ensayo ${index + 1}`, status: index % 2 ? 'DRAFT' : 'PUBLISHED',
  updatedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
}))

test('el filtro considera ensayos más allá de la primera página y después pagina', () => {
  const selected = selectArticles(fixtures, 'DRAFT', 6)
  assert.equal(selected.total, 56)
  assert.equal(selected.totalPages, 6)
  assert.equal(selected.rows.length, 6)
  assert.ok(selected.rows.every((article) => article.status === 'DRAFT'))
})

test('los resultados se ordenan por actualización sin alterar los datos originales', () => {
  const firstId = fixtures[0].id
  assert.equal(selectArticles(fixtures, 'ALL', 1).rows[0].id, 113)
  assert.equal(fixtures[0].id, firstId)
})

test('al borrar la última fila de una página vuelve a una página válida', () => {
  const items = fixtures.slice(0, 11)
  assert.equal(selectArticles(items, 'ALL', 2).rows.length, 1)
  const deletedId = selectArticles(items, 'ALL', 2).rows[0].id
  const after = selectArticles(items.filter((item) => item.id !== deletedId), 'ALL', 2)
  assert.equal(after.currentPage, 1)
  assert.equal(after.rows.length, 10)
  assert.ok(!after.rows.some((item) => item.id === deletedId))
})

test('un filtro sin resultados mantiene la paginación válida', () => {
  assert.deepEqual(selectArticles(fixtures, 'ARCHIVED', 9), {
    rows: [], total: 0, totalPages: 1, currentPage: 1,
  })
})

test('un cambio de estado retira el ensayo del filtro anterior', () => {
  const items = [{ ...fixtures[0], status: 'DRAFT' }]
  const updated = items.map((item) => ({ ...item, status: 'PUBLISHED' }))
  assert.equal(selectArticles(updated, 'DRAFT', 1).total, 0)
  assert.equal(selectArticles(updated, 'PUBLISHED', 1).total, 1)
})

test('las transiciones coinciden con las permitidas por el backend', () => {
  assert.deepEqual(STATUS_TRANSITIONS, {
    DRAFT: ['PUBLISHED', 'ARCHIVED'], PUBLISHED: ['ARCHIVED', 'DRAFT'], ARCHIVED: ['PUBLISHED', 'DRAFT'],
  })
})

test('la API recorre todas las páginas y usa las rutas privadas y los cuerpos correctos', async () => {
  const mockUrl = `data:text/javascript,${encodeURIComponent('export const httpClient = {}')}`
  const { httpClient } = await import(mockUrl)
  const api = await import(moduleUrl('../src/features/articles/api/articlesApi.ts', [
    ["'../../../shared/api'", JSON.stringify(mockUrl)],
  ]))
  const calls = []
  const controller = new AbortController()
  httpClient.get = async (url, options) => {
    calls.push({ url, options })
    const { page, limit } = options.params ?? {}
    return { data: page ? { data: fixtures.slice((page - 1) * limit, page * limit), total: 113, page, limit } : { ...fixtures[0], content: 'Texto privado' } }
  }
  assert.equal((await api.listMyArticles(controller.signal)).length, 113)
  assert.deepEqual(calls.map((call) => call.options.params.page), [1, 2])
  assert.ok(calls.every((call) => call.url === '/articles/mine' && call.options.signal === controller.signal && call.options.params.limit === 100))
  assert.equal((await api.getMyArticle(1)).content, 'Texto privado')
  assert.equal(calls.at(-1).url, '/articles/mine/1')
  await api.listPublishedArticles(2, controller.signal)
  assert.deepEqual(calls.at(-1), { url: '/articles', options: { params: { page: 2, limit: 10 }, signal: controller.signal } })
  httpClient.patch = async (url, body) => { calls.push({ url, body }); return { data: { ...fixtures[0], ...body } } }
  await api.changeArticleStatus(1, 'ARCHIVED')
  assert.deepEqual(calls.at(-1), { url: '/articles/1/status', body: { status: 'ARCHIVED' } })
  await api.changeArticleStatus(1, 'DRAFT')
  assert.deepEqual(calls.at(-1), { url: '/articles/1/status', body: { status: 'DRAFT' } })
  httpClient.patch = async () => { throw new Error('No se puede cambiar el estado') }
  await assert.rejects(api.changeArticleStatus(1, 'PUBLISHED'), /No se puede cambiar el estado/)
  httpClient.delete = async (url) => { calls.push({ url }); return { status: 204 } }
  assert.equal(await api.deleteArticle(1), undefined)
  assert.equal(calls.at(-1).url, '/articles/1')
  httpClient.delete = async () => { throw new Error('No se pudo eliminar') }
  await assert.rejects(api.deleteArticle(1), /No se pudo eliminar/)
})
