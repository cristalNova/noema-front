import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDraftEditor } from '../../features/articles/hooks/useDraftEditor'
import type { ArticleStatus, DraftField } from '../../features/articles/model/article.types'
import './CreateDraftPage.css'
import { STATUS_ACTIONS, STATUS_LABELS, STATUS_TRANSITIONS } from '../../features/articles/model/myArticles'
import { ArticleActionDialog } from '../../features/articles/components/ArticleActionDialog'
import { ArticleStatusBadge } from '../../features/articles/components/ArticleStatusBadge'
import { TagPicker } from '../../features/articles/components/TagPicker'

export function CreateDraftPage() {
  const { id } = useParams()
  if (id !== undefined && (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) {
    return <main className="page-shell"><Link className="back-link" to="/app/articles">← Mis ensayos</Link><p role="alert">El ensayo solicitado no es válido.</p></main>
  }
  return <ArticleEditor key={id ?? 'new'} articleId={id ? Number(id) : undefined} />
}

function ArticleEditor({ articleId }: { articleId?: number }) {
  const editor = useDraftEditor(articleId)
  const form = useRef<HTMLFormElement>(null)
  const [statusAction, setStatusAction] = useState<ArticleStatus | null>(null)
  const statusTrigger = useRef<HTMLButtonElement | null>(null)
  const { values, errors, isSaving, saved, isLoadingCommunities } = editor
  const words = values.content.trim() ? values.content.trim().split(/\s+/u).length : 0
  const isDraft = editor.articleStatus === 'DRAFT'
  const isBusy = isSaving || editor.isChangingStatus

  if (editor.isLoadingArticle || editor.articleError) {
    return <main className="page-shell"><Link className="back-link" to="/app/articles">← Mis ensayos</Link>{editor.isLoadingArticle ? <p role="status">Cargando ensayo…</p> : <div role="alert"><p>{editor.articleError}</p><button type="button" className="button button--secondary" onClick={editor.retryArticle}>Reintentar</button></div>}</main>
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = await editor.save()
    if (field) (form.current?.elements.namedItem(field) as HTMLElement | null)?.focus()
  }

  function fieldError(field: DraftField) {
    return errors[field]?.length ? (
      <p className="draft-error" id={`${field}-error`} role="alert">{errors[field]?.join('. ')}</p>
    ) : null
  }

  return (
    <main className="page-shell draft-page">
      <Link className="back-link" to="/app/articles">← Mis ensayos</Link>
      <header className="page-header">
        <p className="eyebrow">Noema · Espacio de escritura</p>
        <h1>{articleId ? 'Continúa tu ensayo.' : 'Una idea empieza aquí.'}</h1>
        <p>{articleId ? 'Retoma tus ideas y guarda los cambios cuando estés listo.' : 'Dale forma a tu próximo ensayo. Puedes guardarlo y seguir escribiendo más tarde.'}</p>
      </header>

      <form ref={form} onSubmit={submit} noValidate aria-busy={isBusy}>
        <div className="draft-layout">
          <section className="draft-paper" aria-labelledby="draft-heading">
            <div className="draft-paper__heading">
              <h2 id="draft-heading">{articleId ? 'Editar ensayo' : 'Nuevo ensayo'}</h2>
              <ArticleStatusBadge status={editor.articleStatus} />
            </div>
            <fieldset disabled={isBusy} className="draft-fields">
              <legend className="draft-sr-only">Texto del ensayo</legend>
              <div className="draft-field">
                <label htmlFor="title">Título <span aria-hidden="true">*</span></label>
                <input id="title" name="title" value={values.title} onChange={(event) => editor.change('title', event.target.value)} placeholder="El comienzo de una buena idea" required aria-invalid={!!errors.title} aria-describedby={`title-hint${errors.title ? ' title-error' : ''}`} />
                <p className="draft-hint" id="title-hint">{values.title.length}/200 caracteres</p>
                {fieldError('title')}
              </div>
              <div className="draft-field">
                <label htmlFor="description">Descripción <span className="draft-optional">Opcional</span></label>
                <textarea id="description" name="description" rows={3} value={values.description} onChange={(event) => editor.change('description', event.target.value)} placeholder="Unas líneas para contar de qué trata tu ensayo…" aria-invalid={!!errors.description} aria-describedby={`description-hint${errors.description ? ' description-error' : ''}`} />
                <p className="draft-hint" id="description-hint">{values.description.length}/500 caracteres</p>
                {fieldError('description')}
              </div>
              <div className="draft-field">
                <label htmlFor="content">Contenido <span aria-hidden="true">*</span></label>
                <textarea className="draft-content" id="content" name="content" rows={14} value={values.content} onChange={(event) => editor.change('content', event.target.value)} placeholder="Escribe con calma. Este espacio es tuyo." required aria-invalid={!!errors.content} aria-describedby={errors.content ? 'content-error' : undefined} />
                {fieldError('content')}
              </div>
            </fieldset>
            <div className="draft-paper__footer"><span>* Campos obligatorios</span><span>{words} {words === 1 ? 'palabra' : 'palabras'}</span></div>
          </section>

          <aside className="draft-settings" aria-labelledby="settings-heading">
            <h2 id="settings-heading">Detalles del ensayo</h2>
            <fieldset disabled={isBusy} className="draft-fields">
              <legend className="draft-sr-only">Preferencias de publicación</legend>
              <div className="draft-field">
                <label htmlFor="communityId">Comunidad <span className="draft-optional">Opcional</span></label>
                <select id="communityId" name="communityId" value={values.communityId ?? ''} onChange={(event) => editor.change('communityId', event.target.value ? Number(event.target.value) : null)} disabled={isLoadingCommunities} aria-invalid={!!errors.communityId} aria-describedby={`community-hint${errors.communityId ? ' communityId-error' : ''}`}>
                  <option value="">Sin comunidad</option>
                  {values.communityId !== null && !editor.communities.some((community) => community.id === values.communityId) && <option value={values.communityId}>Comunidad actual (#{values.communityId})</option>}
                  {editor.communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
                </select>
                <p className="draft-hint" id="community-hint">La comunidad se aplicará cuando publiques. Solo aparecen aquellas de las que eres miembro activo.</p>
                {isLoadingCommunities && <p className="draft-hint" role="status">Cargando tus comunidades…</p>}
                {editor.communityError && <div className="draft-error" role="alert"><p>No se pudieron cargar tus comunidades. {editor.communityError}</p><button className="button button--secondary" type="button" onClick={editor.retryCommunities}>Reintentar</button><p>Puedes guardar sin comunidad.</p></div>}
                {!isLoadingCommunities && !editor.communityError && editor.communities.length === 0 && <p className="draft-hint">Aún no perteneces a ninguna comunidad.</p>}
                {fieldError('communityId')}
              </div>
              <div className="draft-field">
                <label htmlFor="tags">Etiquetas <span className="draft-optional">Opcional</span></label>
                <TagPicker id="tags" name="tags" value={values.tags} onChange={(tags) => editor.change('tags', tags)} invalid={!!errors.tags} describedBy={`tags-hint${errors.tags ? ' tags-error' : ''}`} />
                {fieldError('tags')}
              </div>
              <div className="draft-field">
                <label htmlFor="collectionId">Colección <span className="draft-optional">Opcional</span></label>
                <select id="collectionId" name="collectionId" value={values.collectionId ?? ''} onChange={(event) => editor.changeCollection(event.target.value ? Number(event.target.value) : null)} disabled={editor.isLoadingCollections} aria-invalid={!!errors.collectionId} aria-describedby={errors.collectionId ? 'collectionId-error' : undefined}>
                  <option value="">Sin colección</option>
                  {values.collectionId !== null && !editor.collections.some((collection) => collection.id === values.collectionId) && <option value={values.collectionId}>Colección actual (#{values.collectionId})</option>}
                  {editor.collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
                </select>
                {editor.isLoadingCollections && <p className="draft-hint" role="status">Cargando tus colecciones…</p>}
                {editor.collectionError && <div className="draft-error" role="alert"><p>No se pudieron cargar tus colecciones. {editor.collectionError}</p><button className="button button--secondary" type="button" onClick={editor.retryCollections}>Reintentar</button><p>Puedes guardar sin colección.</p></div>}
                {!editor.isLoadingCollections && !editor.collectionError && editor.collections.length === 0 && (
                  <p className="draft-hint">
                    Aún no tienes colecciones. <Link to="/app/collections/new" target="_blank" rel="noopener">Crear una colección</Link> (se abre en otra pestaña para que no pierdas lo que escribes; al volver aquí aparecerá en la lista).
                  </p>
                )}
                {fieldError('collectionId')}
                {values.collectionId !== null && (
                  <div className="draft-field draft-field--nested">
                    <label htmlFor="collectionPosition">Posición en la colección <span className="draft-optional">Opcional</span></label>
                    <input id="collectionPosition" name="collectionPosition" type="number" inputMode="numeric" min={1} step={1} value={values.collectionPosition ?? ''} onChange={(event) => editor.change('collectionPosition', event.target.value === '' ? null : Number(event.target.value))} aria-invalid={!!errors.collectionPosition} aria-describedby={`collectionPosition-hint${errors.collectionPosition ? ' collectionPosition-error' : ''}`} />
                    <p className="draft-hint" id="collectionPosition-hint">1 es el primer lugar. Si la dejas vacía, el ensayo queda sin posición.</p>
                    {fieldError('collectionPosition')}
                  </div>
                )}
              </div>
              <div className="draft-premium">
                <label htmlFor="isPremium"><input id="isPremium" name="isPremium" type="checkbox" checked={values.isPremium} onChange={(event) => editor.change('isPremium', event.target.checked)} aria-invalid={!!errors.isPremium} aria-describedby={`premium-hint${errors.isPremium ? ' isPremium-error' : ''}`} /> Ensayo premium</label>
                <p className="draft-hint" id="premium-hint">Al publicarlo, el contenido completo estará disponible para tus suscriptores.</p>
                {fieldError('isPremium')}
              </div>
            </fieldset>
            <div className="draft-privacy"><strong>{isDraft ? 'Solo tú puedes verlo' : `Ensayo ${STATUS_LABELS[editor.articleStatus].toLowerCase()}`}</strong><p>{isDraft ? 'Tu ensayo se guarda como borrador. Nadie más podrá leerlo hasta que decidas publicarlo.' : editor.articleStatus === 'PUBLISHED' ? 'Los cambios se aplicarán a tu ensayo publicado.' : 'Guardar los cambios mantiene tu ensayo archivado.'}</p></div>
            {editor.generalErrors.length > 0 && <div className="draft-error" role="alert">{editor.generalErrors.map((message) => <p key={message}>{message}</p>)}</div>}
            <button type="submit" className="button button--primary draft-save" disabled={isBusy || saved}>{isSaving ? 'Guardando…' : saved ? 'Cambios guardados' : editor.persistedId ? 'Guardar cambios' : 'Guardar borrador'}</button>
            <p className="draft-save-status" role="status">{saved ? 'Guardado. Puedes seguir escribiendo y volver a guardar los cambios.' : 'Guarda tus cambios antes de salir.'}</p>
            <div className="draft-status-section">
              <h3 tabIndex={-1}>Estado y visibilidad</h3>
              <ArticleStatusBadge status={editor.articleStatus} />
              <div className="article-status-actions">
                {STATUS_TRANSITIONS[editor.articleStatus].map((next) => <button key={next} type="button" className={`button ${next === 'PUBLISHED' ? 'button--primary' : 'button--secondary'}`} disabled={isBusy || editor.persistedId === null || editor.hasUnsavedChanges} onClick={(event) => { statusTrigger.current = event.currentTarget; setStatusAction(next) }}>{STATUS_ACTIONS[next]}</button>)}
              </div>
              {(editor.persistedId === null || editor.hasUnsavedChanges) && <p className="draft-hint">Guarda tus cambios para habilitar las acciones de estado.</p>}
              <p className="draft-save-status" role="status">{editor.statusNotice}</p>
              <Link className="back-link" to="/articles">Ver ensayos publicados →</Link>
            </div>
          </aside>
        </div>
      </form>
      {statusAction && editor.persistedId !== null && <ArticleActionDialog article={{ title: values.title, status: editor.articleStatus }} action={statusAction} pending={editor.isChangingStatus} onConfirm={(status) => status ? editor.changeStatus(status) : Promise.resolve('Selecciona un estado.')} onClose={() => { setStatusAction(null); requestAnimationFrame(() => { if (statusTrigger.current?.isConnected && !statusTrigger.current.disabled) statusTrigger.current.focus(); else form.current?.querySelector<HTMLElement>('.draft-status-section h3')?.focus() }) }} />}
    </main>
  )
}
