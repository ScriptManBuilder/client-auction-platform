import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/model/authStore'

// Protects routes that require a signed-in user.
export function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
