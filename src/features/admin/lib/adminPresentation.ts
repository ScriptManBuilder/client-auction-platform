import type { AdminAuctionStatus, AdminCommentStatus, AdminUserDto, AdminUserStatus } from '../model/admin.types'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const avatarPalette = [
  { background: '#dbeafe', foreground: '#1e3a8a' },
  { background: '#dcfce7', foreground: '#166534' },
  { background: '#fef3c7', foreground: '#92400e' },
  { background: '#ede9fe', foreground: '#5b21b6' },
  { background: '#ffe4e6', foreground: '#9f1239' },
  { background: '#ccfbf1', foreground: '#115e59' },
]

const firstDefined = (...values: Array<string | undefined>) =>
  values.find((value) => value?.trim())?.trim() ?? ''

const sanitizeInitials = (value: string) => value.replace(/[^a-zA-Zа-яА-Я0-9]/g, '')

export const adminUserStatuses: AdminUserStatus[] = ['Pending', 'Approved', 'Banned']
export const adminCommentStatuses: AdminCommentStatus[] = ['Pending', 'Approved', 'Rejected']
export const adminAuctionStatuses: AdminAuctionStatus[] = ['Draft', 'Active', 'Finished']

export type AdminFilterValue<TStatus extends string> = 'All' | TStatus
type AdminStatusKind = 'user' | 'comment' | 'auction' | 'role'

const adminStatusCodeMap: Record<AdminStatusKind, Record<string, string>> = {
  user: {
    '0': 'pending',
    '1': 'approved',
    '2': 'banned',
  },
  comment: {
    '0': 'pending',
    '1': 'approved',
    '2': 'rejected',
  },
  auction: {
    '0': 'draft',
    '1': 'active',
    '2': 'finished',
  },
  role: {
    '0': 'user',
    '1': 'admin',
  },
}

const adminStatusLabelMap: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  banned: 'Banned',
  rejected: 'Rejected',
  draft: 'Draft',
  active: 'Active',
  finished: 'Finished',
  user: 'User',
  admin: 'Admin',
}

export function normalizeAdminText(value: unknown) {
  if (typeof value === 'string') {
    return value.toLowerCase()
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return ''
}

export function normalizeAdminValue(value: unknown, kind: AdminStatusKind) {
  const normalized = normalizeAdminText(value)
  return adminStatusCodeMap[kind][normalized] ?? normalized
}

export function formatAdminLabel(value: unknown, kind: AdminStatusKind) {
  const normalized = normalizeAdminValue(value, kind)
  return adminStatusLabelMap[normalized] ?? (typeof value === 'number' || typeof value === 'string' ? String(value) : 'Unknown')
}

export function matchesAdminFilter(value: unknown, filter: string, kind: AdminStatusKind) {
  return normalizeAdminValue(value, kind) === normalizeAdminValue(filter, kind)
}

export function formatAdminDate(value?: string) {
  if (!value) {
    return 'Not available'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleString()
}

export function formatAdminCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not available'
  }

  return currencyFormatter.format(value)
}

export function truncateMiddle(value?: string, start = 8, end = 4) {
  if (!value) {
    return 'Not available'
  }

  if (value.length <= start + end + 3) {
    return value
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`
}

export function getAdminUserNickname(user: Partial<AdminUserDto>) {
  const emailLocalPart = user.email?.split('@')[0]

  return firstDefined(
    user.nickname,
    user.nickName,
    user.userName,
    user.username,
    emailLocalPart,
    user.fullName,
  ) || 'Unknown user'
}

export function buildAdminAvatar(seed: string, primaryLabel?: string, secondaryLabel?: string) {
  const normalizedPrimary = firstDefined(primaryLabel)
  const normalizedSecondary = firstDefined(secondaryLabel)
  const words = normalizedPrimary.split(/\s+/).filter(Boolean)
  const fallback = sanitizeInitials(normalizedSecondary)

  const initials =
    words.length >= 2
      ? `${sanitizeInitials(words[0]).charAt(0)}${sanitizeInitials(words[1]).charAt(0)}`
      : `${sanitizeInitials(normalizedPrimary).charAt(0)}${fallback.charAt(0) || sanitizeInitials(normalizedPrimary).charAt(1)}`

  const safeInitials = (initials || 'AU').toUpperCase()
  const hash = Array.from(seed || normalizedPrimary || normalizedSecondary || 'auction')
    .reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0)
  const palette = avatarPalette[Math.abs(hash) % avatarPalette.length]

  return {
    initials: safeInitials,
    backgroundColor: palette.background,
    textColor: palette.foreground,
  }
}

export function getStatusBadgeClass(status: unknown, kind: Exclude<AdminStatusKind, 'role'>) {
  const normalizedStatus = normalizeAdminValue(status, kind)

  if (normalizedStatus === 'approved' || normalizedStatus === 'active') {
    return 'fin-admin-badge fin-admin-badge-emerald'
  }

  if (normalizedStatus === 'pending' || normalizedStatus === 'draft') {
    return 'fin-admin-badge fin-admin-badge-amber'
  }

  if (normalizedStatus === 'banned' || normalizedStatus === 'rejected') {
    return 'fin-admin-badge fin-admin-badge-rose'
  }

  if (normalizedStatus === 'finished' || normalizedStatus === 'admin') {
    return 'fin-admin-badge fin-admin-badge-blue'
  }

  return 'fin-admin-badge fin-admin-badge-slate'
}

export function getRoleBadgeClass(role: unknown) {
  return normalizeAdminValue(role, 'role').includes('admin')
    ? 'fin-admin-badge fin-admin-badge-blue'
    : 'fin-admin-badge fin-admin-badge-slate'
}

export function isAdminRole(role: unknown) {
  return normalizeAdminValue(role, 'role').includes('admin')
}
