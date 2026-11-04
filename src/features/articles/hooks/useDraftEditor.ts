import { useCallback, useEffect, useRef, useState } from 'react'
import { changeArticleStatus, createDraft, getMyArticle, updateDraft } from '../api/articlesApi'
import { replaceArticleTags } from '../api/articleTagsApi'
import { listAuthorCollections, type CollectionOption } from '../api/collectionsApi'
import { listMyCommunityFilterOptions, type CommunityOption } from '../../communities/api/communitiesApi'
import { useMyProfile } from '../../profiles'
import type { ArticleStatus, DraftErrors, DraftField, DraftInput, DraftValues } from '../model/article.types'
import { getDraftErrors, validateDraft } from '../model/draftValidation'
import { getErrorMessage } from '../../../shared/api/apiError'
import { STATUS_LABELS } from '../model/myArticles'

const EMPTY_DRAFT: DraftValues = {
  title: '', description: '', content: '', isPremium: false, communityId: null,
  collectionId: null, collectionPosition: null, tags: [],
}

function sameTags(a: string[], b: string[]) {
  return a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')
}

export function useDraftEditor(articleId?: number) {
  const [values, setValues] = useState<DraftValues>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [generalErrors, setGeneralErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [persistedId, setPersistedId] = useState<number | null>(null)
  const [lastSavedValues, setLastSavedValues] = useState<DraftValues | null>(null)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [statusNotice, setStatusNotice] = useState('')
  const saving = useRef(false)
  const [communities, setCommunities] = useState<CommunityOption[]>([])
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true)
  const [communityError, setCommunityError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [articleStatus, setArticleStatus] = useState<ArticleStatus>('DRAFT')
  const [isLoadingArticle, setIsLoadingArticle] = useState(articleId !== undefined)
  const [articleError, setArticleError] = useState('')
  const [articleAttempt, setArticleAttempt] = useState(0)
  const { status: profileStatus, profile } = useMyProfile()
  const profileId = profile?.id
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [isFetchingCollections, setIsFetchingCollections] = useState(true)
  const [collectionsFailure, setCollectionsFailure] = useState('')
  const [collectionAttempt, setCollectionAttempt] = useState(0)

  useEffect(() => {
    if (articleId === undefined) return
    const controller = new AbortController()
    getMyArticle(articleId, controller.signal).then((article) => {
      if (controller.signal.aborted) return
      const loadedValues: DraftValues = {
        title: article.title, description: article.description ?? '', content: article.content,
        isPremium: article.isPremium, communityId: article.communityId,
        collectionId: article.collectionId ?? null,
        collectionPosition: article.collectionId != null ? article.collectionPosition ?? null : null,
        tags: (article.articleTags ?? []).map(({ tag }) => tag).sort(),
      }
      setValues(loadedValues)
      setLastSavedValues(loadedValues)
      setPersistedId(article.id)
      setArticleStatus(article.status)
      setArticleError('')
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setArticleError(getErrorMessage(error))
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoadingArticle(false)
    })
    return () => controller.abort()
  }, [articleId, articleAttempt])

  useEffect(() => {
    const controller = new AbortController()
    listMyCommunityFilterOptions(controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        setCommunities(data)
        setCommunityError('')
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCommunityError(getErrorMessage(error))
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoadingCommunities(false)
    })
    return () => controller.abort()
  }, [attempt])

  // Mis colecciones: GET /collections?authorId=<mi perfil>.
  useEffect(() => {
    if (!profileId) return
    const controller = new AbortController()
    listAuthorCollections(profileId, controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        setCollections(data)
        setCollectionsFailure('')
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCollectionsFailure(getErrorMessage(error))
    }).finally(() => {
      if (!controller.signal.aborted) setIsFetchingCollections(false)
    })
    return () => controller.abort()
  }, [profileId, collectionAttempt])

  // El acceso directo para crear una colección abre otra pestaña: al volver al editor se
  // actualiza la lista sin perder el texto. Si falla se conserva la lista que ya había.
  const refreshCollections = useCallback(() => {
    if (!profileId) return
    listAuthorCollections(profileId).then((data) => {
      setCollections(data)
      setCollectionsFailure('')
    }).catch(() => undefined)
  }, [profileId])
  useEffect(() => {
    window.addEventListener('focus', refreshCollections)
    return () => window.removeEventListener('focus', refreshCollections)
  }, [refreshCollections])

  const isLoadingCollections = profileStatus === 'idle' || profileStatus === 'loading' || (profileId !== undefined && isFetchingCollections)
  const collectionError = profileStatus === 'error' ? 'No se pudo cargar tu perfil.' : collectionsFailure

  function change<K extends DraftField>(field: K, value: DraftValues[K]) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setGeneralErrors([])
    setSaved(false)
    setStatusNotice('')
  }

  // La posición solo tiene sentido dentro de una colección: al cambiarla o quitarla se reinicia.
  function changeCollection(collectionId: number | null) {
    setValues((previous) => ({ ...previous, collectionId, collectionPosition: null }))
    setErrors((previous) => ({ ...previous, collectionId: undefined, collectionPosition: undefined }))
    setGeneralErrors([])
    setSaved(false)
    setStatusNotice('')
  }

  const hasUnsavedChanges = lastSavedValues === null || JSON.stringify(values) !== JSON.stringify(lastSavedValues)

  async function changeStatus(nextStatus: ArticleStatus): Promise<string | null> {
    if (saving.current) return 'Hay otra operación en curso.'
    if (persistedId === null || hasUnsavedChanges) return 'Guarda tus cambios antes de cambiar el estado.'
    saving.current = true
    setIsChangingStatus(true)
    setStatusNotice('')
    try {
      const updated = await changeArticleStatus(persistedId, nextStatus)
      setArticleStatus(updated.status)
      setStatusNotice(`El ensayo ahora está en estado ${STATUS_LABELS[updated.status].toLowerCase()}.`)
      return null
    } catch (error) {
      return getErrorMessage(error)
    } finally {
      saving.current = false
      setIsChangingStatus(false)
    }
  }

  async function save(): Promise<DraftField | undefined> {
    if (saving.current || saved) return
    const validation = validateDraft(values)
    setErrors(validation)
    setGeneralErrors([])
    const first = Object.keys(validation)[0] as DraftField | undefined
    if (first) return first
    saving.current = true
    setIsSaving(true)
    try {
      // Las etiquetas viajan por su propio endpoint: el body del ensayo no las admite.
      const { tags, ...fields } = values
      const input: DraftInput = fields
      const article = persistedId === null
        ? await createDraft(input)
        : await updateDraft(persistedId, input)
      let confirmedTags = lastSavedValues?.tags ?? []
      setPersistedId(article.id)
      setArticleStatus(article.status)
      setLastSavedValues({ ...values, tags: confirmedTags })
      if (!sameTags(tags, confirmedTags)) {
        try {
          confirmedTags = await replaceArticleTags(article.id, tags)
        } catch (error) {
          const result = getDraftErrors(error)
          setErrors({ tags: ['No se pudieron guardar las etiquetas.'], ...result.fields })
          setGeneralErrors(['El ensayo se guardó, pero las etiquetas no. Vuelve a guardar para reintentarlo.', ...result.general])
          return 'tags'
        }
      }
      // El backend devuelve las etiquetas normalizadas y ordenadas; el editor las refleja.
      setValues((previous) => ({ ...previous, tags: confirmedTags }))
      setLastSavedValues({ ...values, tags: confirmedTags })
      setSaved(true)
    } catch (error) {
      const result = getDraftErrors(error)
      setErrors(result.fields)
      setGeneralErrors(result.general)
      return Object.keys(result.fields)[0] as DraftField | undefined
    } finally {
      saving.current = false
      setIsSaving(false)
    }
  }

  return {
    persistedId, hasUnsavedChanges, isChangingStatus, changeStatus, statusNotice,
    articleStatus, isLoadingArticle, articleError,
    retryArticle: () => { setIsLoadingArticle(true); setArticleAttempt((value) => value + 1) },
    values, errors, generalErrors, isSaving, saved, change, changeCollection, save,
    communities, isLoadingCommunities, communityError,
    retryCommunities: () => { setIsLoadingCommunities(true); setAttempt((value) => value + 1) },
    collections, isLoadingCollections, collectionError,
    retryCollections: () => { setIsFetchingCollections(true); setCollectionAttempt((value) => value + 1) },
  }
}
