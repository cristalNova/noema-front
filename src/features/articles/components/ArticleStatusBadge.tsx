import type { ArticleStatus } from '../model/article.types'
import { STATUS_LABELS } from '../model/myArticles'
import './ArticleState.css'

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return <span className={`article-state article-state--${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>
}
