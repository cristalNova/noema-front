import type { ArticleSummary } from './article.types'

type InCollection = Pick<ArticleSummary, 'id' | 'collectionId' | 'collectionPosition'>

/**
 * Ensayos de una colección en el mismo orden que ven los lectores (GET /articles?collectionId=):
 * por posición ascendente, con los que no tienen posición al final y el id como desempate.
 */
export function orderCollectionEssays<T extends InCollection>(articles: T[], collectionId: number): { positioned: T[]; unpositioned: T[] } {
  const inCollection = articles.filter((article) => article.collectionId === collectionId)
  const byId = (a: T, b: T) => a.id - b.id
  const positioned = inCollection
    .filter((article) => article.collectionPosition != null)
    .sort((a, b) => (a.collectionPosition as number) - (b.collectionPosition as number) || byId(a, b))
  const unpositioned = inCollection.filter((article) => article.collectionPosition == null).sort(byId)
  return { positioned, unpositioned }
}
