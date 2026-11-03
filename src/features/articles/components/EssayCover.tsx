import type { ArticleSummary } from '../model/article.types'
import './EssayCover.css'

export function EssayCover({ article }: { article: ArticleSummary }) {
  return (
    <span className={`essay-cover essay-cover--${article.id % 4}`} aria-hidden="true">
      <span className="essay-cover__edition">Noema / Ensayos</span>
      <span className="essay-cover__title">{article.title}</span>
      <span className="essay-cover__ornament" />
      <span className="essay-cover__footer">{article.articleTags?.[0]?.tag ?? 'Una idea para compartir'}<span>↗</span></span>
    </span>
  )
}
