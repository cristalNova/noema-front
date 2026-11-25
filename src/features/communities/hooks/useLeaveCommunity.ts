import { useCallback } from 'react'
import { getErrorMessage, toApiError } from '@/shared/api'
import { leaveCommunity } from '../api/membersApi'

/**
 * Caso de uso: salir de una comunidad. Devuelve null si ya no eres miembro, o el motivo que
 * dio el servidor (por ejemplo, el propietario no puede salir).
 */
export function useLeaveCommunity() {
  return useCallback(async (communityId: number): Promise<string | null> => {
    try {
      await leaveCommunity(communityId)
      return null
    } catch (reason) {
      // 404: ya no eres miembro (o la comunidad ya no existe). El resultado buscado ya se dio.
      if (toApiError(reason).status === 404) return null
      return getErrorMessage(reason)
    }
  }, [])
}
