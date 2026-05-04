import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponseDto, UserDto } from './auth.types'

const AUTH_STORAGE_KEY = 'auction-platform-auth'

interface SetSessionPayload {
  accessToken: string
  refreshToken: string
  user?: UserDto | null
}

interface AuthStoreState {
  accessToken: string | null
  refreshToken: string | null
  user: UserDto | null
  setSession: (payload: SetSessionPayload) => void
  setUser: (user: UserDto | null) => void
  clearAuth: () => void
}

// Zustand store keeps auth session globally and persists it for browser refreshes.
export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => {
        set((state) => ({
          accessToken,
          refreshToken,
          user: user ?? state.user,
        }))
      },
      setUser: (user) => {
        set({ user })
      },
      clearAuth: () => {
        set({ accessToken: null, refreshToken: null, user: null })
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)

export function applyAuthResponse(response: AuthResponseDto) {
  useAuthStore.getState().setSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  })
}
