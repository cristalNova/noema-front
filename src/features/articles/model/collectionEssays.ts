import type { ArticleSummary } from './article.types'

type InCollection = Pick<ArticleSummary, 'id' | 'collectionId' | 'collectionPosition'>

/**
 * Ensayos de una colección en el mismo orden que ven los lectores (GET /articles?collectionId=):
 * por posición ascendente, con los que no tienen posición (datos antiguos) al final y el id como desempate.
 */
export function orderCollectionEssays<T extends InCollection>(articles: T[], collectionId: number): T[] {
  const rank = (article: T) => article.collectionPosition ?? Number.POSITIVE_INFINITY
  return articles
    .filter((article) => article.collectionId === collectionId)
    .sort((a, b) => {
      const byPosition = rank(a) === rank(b) ? 0 : rank(a) < rank(b) ? -1 : 1
      return byPosition || a.id - b.id
    })
}

/** Mueve el elemento `from` a la posición `to` sin modificar la lista original. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items]
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
