import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthPromptContext, AuthPromptDialog, type AuthPromptContextValue } from '@/features/auth'
import { captureReturnState, type ReturnState } from '@/shared/utils/navigation'

interface Prompt {
  reason?: string
  returnState: ReturnState
}

/** Debe montarse dentro del router: el aviso usa <Link> para ir a login/registro. */
export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null)

  // La posición se captura al abrir el aviso, no al hacer clic en "Iniciar sesión".
  const promptLogin = useCallback((reason?: string, returnTo?: string) => {
    setPrompt({ reason, returnState: captureReturnState(returnTo) })
  }, [])
  const close = useCallback(() => setPrompt(null), [])

  const value = useMemo<AuthPromptContextValue>(() => ({ promptLogin }), [promptLogin])

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      {prompt && <AuthPromptDialog reason={prompt.reason} returnState={prompt.returnState} onClose={close} />}
    </AuthPromptContext.Provider>
  )
}
