import { useEffect, useState } from 'react'
import { authService } from '../../../services/authService'
import { useAuthStore } from '../model/authStore'

// Bootstraps persisted auth state and validates it against /api/auth/me.
export function useAuthBootstrap() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const setUser = useAuthStore((state) => state.setUser)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isDisposed = false

    const bootstrap = async () => {
      if (!accessToken) {
        if (!isDisposed) {
          setIsReady(true)
        }

        return
      }

      try {
        const me = await authService.me()

        if (!isDisposed) {
          setUser(me)
          setIsReady(true)
        }
      } catch {
        if (!isDisposed) {
          clearAuth()
          setIsReady(true)
        }
      }
    }

    void bootstrap()

    return () => {
      isDisposed = true
    }
  }, [accessToken, clearAuth, setUser])

  return {
    isReady,
  }
}
