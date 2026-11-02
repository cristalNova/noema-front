import { useRef } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useDraftEditor } from '../../features/articles/hooks/useDraftEditor'
import type { DraftField } from '../../features/articles/model/article.types'
import './CreateDraftPage.css'

export function CreateDraftPage() {
  const editor = useDraftEditor()
  const form = useRef<HTMLFormElement>(null)
  const { values, errors, isSaving, saved, isLoadingCommunities } = editor
  const words = values.content.trim() ? values.content.trim().split(/\s+/u).length : 0

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
      <Link className="back-link" to="/communities">← Explorar comunidades</Link>
      <header className="page-header">
        <p className="eyebrow">Noema · Espacio de escritura</p>
        <h1>Una idea empieza aquí.</h1>
        <p>Dale forma a tu próximo ensayo. Puedes guardarlo y seguir escribiendo más tarde.</p>
      </header>

      <form ref={form} onSubmit={submit} noValidate aria-busy={isSaving}>
        <div className="draft-layout">
          <section className="draft-paper" aria-labelledby="draft-heading">
            <div className="draft-paper__heading">
              <h2 id="draft-heading">Nuevo ensayo</h2>
              <span className="draft-badge">Borrador</span>
            </div>
            <fieldset disabled={isSaving} className="draft-fields">
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
            <fieldset disabled={isSaving} className="draft-fields">
              <legend className="draft-sr-only">Preferencias de publicación</legend>
              <div className="draft-field">
                <label htmlFor="communityId">Comunidad <span className="draft-optional">Opcional</span></label>
                <select id="communityId" name="communityId" value={values.communityId ?? ''} onChange={(event) => editor.change('communityId', event.target.value ? Number(event.target.value) : null)} disabled={isLoadingCommunities} aria-invalid={!!errors.communityId} aria-describedby={`community-hint${errors.communityId ? ' communityId-error' : ''}`}>
                  <option value="">Sin comunidad</option>
                  {editor.communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
                </select>
                <p className="draft-hint" id="community-hint">La comunidad se aplicará cuando publiques. Solo aparecen aquellas de las que eres miembro activo.</p>
                {isLoadingCommunities && <p className="draft-hint" role="status">Cargando tus comunidades…</p>}
                {editor.communityError && <div className="draft-error" role="alert"><p>No se pudieron cargar tus comunidades. {editor.communityError}</p><button className="button button--secondary" type="button" onClick={editor.retryCommunities}>Reintentar</button><p>Puedes guardar sin comunidad.</p></div>}
                {!isLoadingCommunities && !editor.communityError && editor.communities.length === 0 && <p className="draft-hint">Aún no perteneces a ninguna comunidad.</p>}
                {fieldError('communityId')}
              </div>
              <div className="draft-premium">
                <label htmlFor="isPremium"><input id="isPremium" name="isPremium" type="checkbox" checked={values.isPremium} onChange={(event) => editor.change('isPremium', event.target.checked)} aria-invalid={!!errors.isPremium} aria-describedby={`premium-hint${errors.isPremium ? ' isPremium-error' : ''}`} /> Ensayo premium</label>
                <p className="draft-hint" id="premium-hint">Al publicarlo, el contenido completo estará disponible para tus suscriptores.</p>
                {fieldError('isPremium')}
              </div>
            </fieldset>
            <div className="draft-privacy"><strong>Solo tú puedes verlo</strong><p>Tu ensayo se guarda como borrador. Nadie más podrá leerlo hasta que decidas publicarlo.</p></div>
            {editor.generalErrors.length > 0 && <div className="draft-error" role="alert">{editor.generalErrors.map((message) => <p key={message}>{message}</p>)}</div>}
            <button type="submit" className="button button--primary draft-save" disabled={isSaving || saved}>{isSaving ? 'Guardando…' : saved ? 'Borrador guardado' : 'Guardar borrador'}</button>
            <p className="draft-save-status" role="status">{saved ? 'Guardado. Puedes seguir escribiendo y volver a guardar los cambios.' : 'Guarda tus cambios antes de salir.'}</p>
          </aside>
        </div>
      </form>
    </main>
  )
}
