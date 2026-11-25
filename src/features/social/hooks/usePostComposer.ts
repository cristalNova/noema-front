import { useEffect, useRef, useState } from 'react'
import { listMyArticles } from '@/features/articles/api/articlesApi'
import type { ArticleSummary } from '@/features/articles/model/article.types'
import { listMyCommunityFilterOptions, type CommunityOption } from '@/features/communities/api/communitiesApi'
import { toApiError } from '@/shared/api/apiError'
import { createPost, type CreatePostInput } from '../api/postsApi'

const MAX_CONTENT_LENGTH = 2000

export function usePostComposer(onCreated: (post: Awaited<ReturnType<typeof createPost>>) => void) {
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<CreatePostInput['visibility']>('PUBLIC')
  const [articleId, setArticleId] = useState<number | undefined>()
  const [communityId, setCommunityId] = useState<number | undefined>()
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [communities, setCommunities] = useState<CommunityOption[]>([])
  const [optionsError, setOptionsError] = useState('')
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([listMyArticles(controller.signal), listMyCommunityFilterOptions(controller.signal)])
      .then(([articleResult, communityResult]) => {
        if (controller.signal.aborted) return
        const errors: string[] = []
        if (articleResult.status === 'fulfilled') setArticles(articleResult.value.filter((article) => article.status === 'PUBLISHED'))
        else errors.push(toApiError(articleResult.reason).message)
        if (communityResult.status === 'fulfilled') setCommunities(communityResult.value)
        else if (toApiError(communityResult.reason).status !== 404) errors.push(toApiError(communityResult.reason).message)
        setOptionsError(errors.join(' '))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingOptions(false)
      })
    return () => controller.abort()
  }, [])

  async function publish() {
    const trimmed = content.trim()
    if (!trimmed || content.length > MAX_CONTENT_LENGTH || pending.current) return
    pending.current = true
    setIsPublishing(true)
    setError('')
    const input: CreatePostInput = {
      postType: 'ORIGINAL',
      content,
      visibility,
      ...(articleId === undefined ? {} : { articleId }),
      ...(communityId === undefined ? {} : { communityId }),
    }
    try {
      const post = await createPost(input)
      onCreated(post)
      setContent('')
      setArticleId(undefined)
      setCommunityId(undefined)
      setVisibility('PUBLIC')
    } catch (reason: unknown) {
      setError(toApiError(reason).message)
    } finally {
      pending.current = false
      setIsPublishing(false)
    }
  }

  return {
    content, setContent, visibility, setVisibility,
    articleId, setArticleId, communityId,
    setCommunityId: (next: number | undefined) => {
      setCommunityId(next)
      setVisibility(next === undefined ? 'PUBLIC' : 'COMMUNITY')
    },
    articles, communities, optionsError, isLoadingOptions, isPublishing, error, publish,
    isValid: content.trim().length > 0 && content.length <= MAX_CONTENT_LENGTH,
    characterCount: content.length, maxContentLength: MAX_CONTENT_LENGTH,
  }
}
