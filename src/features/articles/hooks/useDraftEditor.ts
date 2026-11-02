import { useEffect, useRef, useState } from 'react'
import { createDraft, getMyArticle, updateDraft } from '../api/articlesApi'
import { listMyCommunityOptions } from '../../communities/api/communitiesApi'
import type { Community } from '../../communities/model/community.types'
import type { ArticleStatus, DraftErrors, DraftField, DraftInput } from '../model/article.types'
import { getDraftErrors, validateDraft } from '../model/draftValidation'
import { getErrorMessage } from '../../../shared/api/apiError'

const EMPTY_DRAFT: DraftInput = { title: '', description: '', content: '', isPremium: false, communityId: null }

export function useDraftEditor(articleId?: number) {
  const [values, setValues] = useState<DraftInput>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [generalErrors, setGeneralErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const savedId = useRef<number | null>(null)
  const saving = useRef(false)
  const [communities, setCommunities] = useState<Community[]>([])
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true)
  const [communityError, setCommunityError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [articleStatus, setArticleStatus] = useState<ArticleStatus>('DRAFT')
  const [isLoadingArticle, setIsLoadingArticle] = useState(articleId !== undefined)
  const [articleError, setArticleError] = useState('')
  const [articleAttempt, setArticleAttempt] = useState(0)

  useEffect(() => {
    if (articleId === undefined) return
    const controller = new AbortController()
    getMyArticle(articleId, controller.signal).then((article) => {
      if (controller.signal.aborted) return
      setValues({ title: article.title, description: article.description ?? '', content: article.content,
        isPremium: article.isPremium, communityId: article.communityId })
      savedId.current = article.id
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
    listMyCommunityOptions(controller.signal).then((data) => {
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

  function change<K extends DraftField>(field: K, value: DraftInput[K]) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setGeneralErrors([])
    setSaved(false)
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
      const article = savedId.current === null
        ? await createDraft(values)
        : await updateDraft(savedId.current, values)
      savedId.current = article.id
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
    articleStatus, isLoadingArticle, articleError,
    retryArticle: () => { setIsLoadingArticle(true); setArticleAttempt((value) => value + 1) },
    values, errors, generalErrors, isSaving, saved, change, save,
    communities, isLoadingCommunities, communityError,
    retryCommunities: () => { setIsLoadingCommunities(true); setAttempt((value) => value + 1) },
  }
}
