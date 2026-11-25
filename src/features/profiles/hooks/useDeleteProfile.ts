import { useState } from 'react'
import { getErrorMessage, toApiError } from '@/shared/api'
import { profilesApi } from '../api/profilesApi'

/** Caso de uso: eliminar mi perfil. `remove` devuelve null si se eliminó, o el mensaje de error. */
export function useDeleteProfile() {
  const [pending, setPending] = useState(false)

  async function remove(): Promise<string | null> {
    setPending(true)
    try {
      await profilesApi.remove()
      return null
    } catch (e) {
      // 404: el perfil ya no existe (se borró desde otra pestaña); el resultado buscado ya se dio.
      if (toApiError(e).status === 404) return null
      return getErrorMessage(e)
    } finally {
      setPending(false)
    }
  }

  return { remove, pending }
}
