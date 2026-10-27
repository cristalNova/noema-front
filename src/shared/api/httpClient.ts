import axios from 'axios'
import { toApiError } from './apiError'
import { tokenStorage } from './tokenStorage'

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

let onUnauthorized: (() => void) | null = null

/** La capa de sesión (AuthProvider) registra aquí qué hacer ante un 401. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    // Un 401 en /auth/login son credenciales inválidas, no una sesión vencida.
    const isLogin = axios.isAxiosError(error) && error.config?.url === '/auth/login'
    if (apiError.status === 401 && !isLogin) {
      tokenStorage.clear()
      onUnauthorized?.()
    }
    return Promise.reject(apiError)
  },
)
