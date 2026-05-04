import { useAuthStore } from '../features/auth/model/authStore'
import { isAdminUser } from '../shared/lib/authRole'

// Legacy compatibility hook that reads auth state from the new global store.
export function useAuth() {
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const saveToken = (nextToken: string) => {
    setSession({
      accessToken: nextToken,
      refreshToken: '',
      user,
    })
  }

  const logout = () => {
    clearAuth()
  }

  return {
    token,
    user,
    isAuthenticated: Boolean(token),
    isAdmin: isAdminUser(user),
    saveToken,
    logout,
  }
}
