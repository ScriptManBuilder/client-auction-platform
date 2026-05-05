import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { registerUnauthorizedHandler } from './api/apiClient'
import { useAuthBootstrap } from './features/auth/hooks/useAuthBootstrap'
import { useAuthStore } from './features/auth/model/authStore'
import { AuctionsPage } from './pages/AuctionsPage'
import { AuctionDetailsPage } from './pages/AuctionDetailsPage'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AdminAuctionsPage } from './pages/admin/AdminAuctionsPage'
import { AdminCommentsPage } from './pages/admin/AdminCommentsPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { authService } from './services/authService'
import { isAdminUser } from './shared/lib/authRole'
import { AdminRoute } from './shared/router/AdminRoute'
import { ProtectedRoute } from './shared/router/ProtectedRoute'
import { AppNavbar } from './shared/ui/AppNavbar'

// App coordinates global concerns (navigation + routing + auth state) in one place.
function App() {
  const navigate = useNavigate()

  const { isReady } = useAuthBootstrap()
  const accessToken = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const isAuthenticated = Boolean(accessToken)
  const isAdmin = isAdminUser(user)

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authService.logout(refreshToken ? { refreshToken } : undefined)
    },
    onSettled: () => {
      clearAuth()
      navigate('/login', { replace: true })
    },
  })

  useEffect(() => {
    // Axios interceptors call this callback when refresh fails after a 401.
    registerUnauthorizedHandler(() => {
      clearAuth()
      navigate('/login', { replace: true })
    })
  }, [clearAuth, navigate])

  if (!isReady) {
    return (
      <div className="fin-page-shell grid min-h-screen place-items-center text-slate-700">
        <p className="text-sm font-semibold">Checking your session...</p>
      </div>
    )
  }

  return (
    <div className="fin-page-shell text-slate-900">
      <div className="pointer-events-none absolute -left-24 top-16 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl sm:-left-40 sm:h-72 sm:w-72" />
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl sm:h-96 sm:w-96" />
      <AppNavbar
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        userName={user?.fullName}
        isLoggingOut={logoutMutation.isPending}
        onLogout={() => logoutMutation.mutate()}
      />

      <main className="fin-main-container">
        <Routes>
          <Route path="/" element={<Navigate to="/auctions" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auctions" element={<AuctionsPage />} />
          <Route path="/auctions/:id" element={<AuctionDetailsPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/account" element={<AccountPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/comments" element={<AdminCommentsPage />} />
            <Route path="/admin/auctions" element={<AdminAuctionsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/auctions" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
