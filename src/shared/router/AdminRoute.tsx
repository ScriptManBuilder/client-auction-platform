import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/model/authStore'
import { isAdminUser } from '../lib/authRole'

// Restricts route access to users with the Admin role.
export function AdminRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/auctions" replace />
  }

  return <Outlet />
}
