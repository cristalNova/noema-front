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

// Un 401 aquí no significa "sesión vencida": son credenciales malas o un token ya revocado.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/logout']

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : ''
    const hadSession = tokenStorage.get() !== null

    if (apiError.status === 401 && hadSession && !AUTH_ENDPOINTS.includes(url)) {
      tokenStorage.clear()
      onUnauthorized?.()
    }
    return Promise.reject(apiError)
  },
)
