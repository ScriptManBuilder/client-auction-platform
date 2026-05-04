import type { UserDto } from '../../features/auth/model/auth.types'

function normalizeRole(role: string) {
  return role.trim().toLowerCase()
}

// Helper is used by route guards and navbar to check admin-only access.
export function isAdminUser(user: UserDto | null) {
  if (!user) {
    return false
  }

  const primaryRole = user.role ? normalizeRole(user.role) : null

  if (primaryRole === 'admin') {
    return true
  }

  return (user.roles ?? []).some((role) => normalizeRole(role) === 'admin')
}
