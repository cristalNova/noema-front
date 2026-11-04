import { Button } from '@/shared/components/Button'
import { usePostComposer } from '../hooks/usePostComposer'
import type { Post } from '../model/post.types'
import './PostComposer.css'

interface PostComposerProps {
  onCreated: (post: Post) => void
}

export function PostComposer({ onCreated }: PostComposerProps) {
  const composer = usePostComposer(onCreated)
  const selectedArticle = composer.articles.find((article) => article.id === composer.articleId)
  const selectedCommunity = composer.communities.find((community) => community.id === composer.communityId)

  return (
    <form className="post-composer" onSubmit={(event) => { event.preventDefault(); void composer.publish() }}>
      <div className="post-composer__topline">
        <div>
          <p className="post-composer__eyebrow">Comparte una idea</p>
          <h2>¿Qué estás pensando?</h2>
        </div>
        <span className="post-composer__count" aria-live="polite">{composer.characterCount} / {composer.maxContentLength}</span>
      </div>
      <label className="post-composer__label" htmlFor="post-content">Contenido de la publicación</label>
      <textarea
        id="post-content"
        value={composer.content}
        onChange={(event) => composer.setContent(event.target.value)}
        placeholder="Escribe algo que quieras compartir…"
        rows={5}
        aria-describedby="post-content-count"
      />
      <span id="post-content-count" className="post-composer__hint">Los saltos de línea se conservarán.</span>

      <div className="post-composer__options">
        <label>
          Visibilidad
          <select aria-label="Audiencia de publicación" value={composer.visibility} onChange={(event) => composer.setVisibility(event.target.value as typeof composer.visibility)}>
            <option value="PUBLIC">Pública</option>
            <option value="FOLLOWERS">Solo seguidores</option>
            <option value="COMMUNITY">Comunidad</option>
          </select>
        </label>
        <label>
          Ensayo (opcional)
          <select aria-label="Ensayo asociado" value={composer.articleId ?? ''} onChange={(event) => composer.setArticleId(event.target.value ? Number(event.target.value) : undefined)} disabled={composer.isLoadingOptions}>
            <option value="">Sin ensayo asociado</option>
            {composer.articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}
          </select>
        </label>
        <label>
          Vincular comunidad (opcional)
          <select aria-label="Espacio de publicación" value={composer.communityId ?? ''} onChange={(event) => composer.setCommunityId(event.target.value ? Number(event.target.value) : undefined)} disabled={composer.isLoadingOptions}>
            <option value="">Sin comunidad</option>
            {composer.communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
          </select>
        </label>
      </div>
      {(selectedArticle || selectedCommunity) && (
        <p className="post-composer__selection" role="status">
          {selectedArticle && <>Ensayo: <strong>{selectedArticle.title}</strong>. </>}
          {selectedCommunity && <>Comunidad: <strong>{selectedCommunity.name}</strong>.</>}
        </p>
      )}
      {composer.optionsError && <p className="post-composer__message post-composer__message--error" role="alert">{composer.optionsError}</p>}
      {composer.error && <p className="post-composer__message post-composer__message--error" role="alert">{composer.error}</p>}
      <div className="post-composer__footer">
        <p className="post-composer__hint">La publicación debe tener contenido.</p>
        <Button type="submit" loading={composer.isPublishing} disabled={!composer.isValid}>Publicar</Button>
      </div>
    </form>
  )
}
