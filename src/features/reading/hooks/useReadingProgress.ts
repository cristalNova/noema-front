import { useEffect, useRef, useState, type RefObject } from 'react'
import { useAuth } from '@/features/auth'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import { getProgress, saveProgress } from '../api/progressApi'

const SAVE_DELAY_MS = 1200

export function useReadingProgress(articleId: number, enabled: boolean, contentRef: RefObject<HTMLElement | null>, resume: boolean) {
  const { isAuthenticated } = useAuth()
  const [percentage, setPercentage] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const resumed = useRef(false)
  const savedPercentage = useRef(0)

  useEffect(() => {
    if (!enabled || !isAuthenticated) return
    const controller = new AbortController()
    getProgress(articleId, controller.signal).then((entry) => {
      if (controller.signal.aborted) return
      savedPercentage.current = entry?.percentage ?? 0
      setPercentage(savedPercentage.current)
      setLoaded(true)
      setError('')
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      if (reason instanceof ApiError && reason.status === 404) {
        savedPercentage.current = 0
        setPercentage(0)
        setLoaded(true)
        setError('')
      } else {
        setError(`No se pudo cargar tu progreso. ${getErrorMessage(reason)}`)
      }
    })
    return () => controller.abort()
  }, [articleId, enabled, isAuthenticated, attempt])

  useEffect(() => {
    if (!enabled || (isAuthenticated && !loaded)) return
    const content = contentRef.current
    if (!content) return
    let disposed = false
    let latest = savedPercentage.current
    let queued = savedPercentage.current
    let timer: ReturnType<typeof setTimeout> | undefined
    let writes = Promise.resolve()

    function persist(value: number) {
      if (!isAuthenticated || value <= queued) return
      queued = value
      writes = writes.catch(() => {}).then(async () => {
        try {
          await saveProgress(articleId, value)
          if (!disposed) setError('')
        } catch (reason) {
          if (!disposed) setError(`No se pudo guardar tu progreso. ${getErrorMessage(reason)}`)
          // El siguiente desplazamiento podrá volver a intentar guardar este valor.
          if (queued === value) queued = Math.max(0, value - 1)
        }
      })
    }

    function measure() {
      if (!content) return
      const rect = content.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const next = Math.min(100, Math.max(0, Math.round((window.scrollY + window.innerHeight - top) / Math.max(1, rect.height) * 100)))
      if (next <= latest) return
      latest = next
      setPercentage(next)
      clearTimeout(timer)
      if (next === 100) persist(next)
      else timer = setTimeout(() => persist(latest), SAVE_DELAY_MS)
    }

    if (resume && !resumed.current && savedPercentage.current > 0) {
      resumed.current = true
      requestAnimationFrame(() => {
        if (disposed) return
        const rect = content.getBoundingClientRect()
        const top = rect.top + window.scrollY
        window.scrollTo({ top: Math.max(0, top + rect.height * savedPercentage.current / 100 - window.innerHeight), behavior: 'instant' })
      })
    }
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      disposed = true
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      clearTimeout(timer)
      persist(latest)
    }
  }, [articleId, contentRef, enabled, isAuthenticated, loaded, resume])

  return { percentage, ready: !isAuthenticated || loaded, error, retry: () => { setLoaded(false); setAttempt((value) => value + 1) } }
}
