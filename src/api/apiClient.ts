import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import type { AuthResponseDto, UserDto } from '../features/auth/model/auth.types'
import { useAuthStore } from '../features/auth/model/authStore'
import { env } from '../shared/config/env'

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let onUnauthorized: (() => void) | null = null
let refreshRequest: Promise<AuthResponseDto | null> | null = null

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export const apiClient = axios.create({
  baseURL: env.apiUrl,
})

const refreshClient = axios.create({
  baseURL: env.apiUrl,
})

function forceLogout() {
  useAuthStore.getState().clearAuth()
  onUnauthorized?.()
}

async function getCurrentUser(accessToken: string): Promise<UserDto | null> {
  try {
    const { data } = await refreshClient.get<UserDto>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return data
  } catch {
    return null
  }
}

async function refreshSession(): Promise<AuthResponseDto | null> {
  const { refreshToken, setSession } = useAuthStore.getState()

  if (!refreshToken) {
    return null
  }

  if (!refreshRequest) {
    refreshRequest = refreshClient
      .post<AuthResponseDto>('/api/auth/refresh', {
        refreshToken,
      })
      .then(async ({ data }) => {
        const me = await getCurrentUser(data.accessToken)

        setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: me ?? data.user,
        })

        return {
          ...data,
          user: me ?? data.user,
        }
      })
      .catch(() => {
        return null
      })
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken

  if (accessToken) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (!originalRequest || status !== 401) {
      return Promise.reject(error)
    }

    const requestUrl = originalRequest.url ?? ''
    const isAuthEndpoint =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/register') ||
      requestUrl.includes('/api/auth/refresh')

    if (isAuthEndpoint || originalRequest._retry) {
      if (requestUrl.includes('/api/auth/refresh')) {
        forceLogout()
      }

      return Promise.reject(error)
    }

    originalRequest._retry = true

    const refreshedSession = await refreshSession()

    if (!refreshedSession) {
      forceLogout()
      return Promise.reject(error)
    }

    originalRequest.headers = originalRequest.headers ?? {}
    ;(originalRequest.headers as Record<string, string>).Authorization =
      `Bearer ${refreshedSession.accessToken}`

    return apiClient(originalRequest)
  },
)
