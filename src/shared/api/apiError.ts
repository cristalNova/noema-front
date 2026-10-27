import { isAxiosError } from 'axios'

/** Error normalizado del backend (NestJS: { statusCode, message: string | string[], error }). */
export class ApiError extends Error {
  status: number | null
  messages: string[]

  constructor(status: number | null, messages: string[]) {
    super(messages.join('\n'))
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
  }
}

const FALLBACK = 'Ocurrió un error inesperado. Intenta de nuevo.'

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiError(null, ['No se pudo conectar con el servidor.'])
    }
    const { status, data } = error.response
    const raw: unknown = data?.message
    const messages = Array.isArray(raw)
      ? raw.map(String)
      : typeof raw === 'string'
        ? [raw]
        : [FALLBACK]
    return new ApiError(status, messages)
  }

  return new ApiError(null, [FALLBACK])
}

export function getErrorMessage(error: unknown): string {
  return toApiError(error).message
}
