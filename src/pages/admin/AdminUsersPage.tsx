import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { AdminUserStatus } from '../../features/admin/model/admin.types'
import {
  adminUserStatuses,
  buildAdminAvatar,
  formatAdminLabel,
  formatAdminDate,
  getAdminUserNickname,
  getRoleBadgeClass,
  getStatusBadgeClass,
  isAdminRole,
  matchesAdminFilter,
  truncateMiddle,
  type AdminFilterValue,
} from '../../features/admin/lib/adminPresentation'
import { AdminPanelShell } from '../../features/admin/ui/AdminPanelShell'
import { adminService } from '../../services/adminService'
import { getApiErrorMessage } from '../../shared/lib/apiError'

const statusOptions: Array<AdminFilterValue<AdminUserStatus>> = ['All', ...adminUserStatuses]

type UserAction = 'approve' | 'ban' | 'promote'

export function AdminUsersPage() {
  const [statusFilter, setStatusFilter] = useState<AdminFilterValue<AdminUserStatus>>('All')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ['admin-users-registry'],
    queryFn: async () => {
      const groups = await Promise.all(
        adminUserStatuses.map(async (status) => [status, await adminService.getUsers(status)] as const),
      )

      const dedupedUsers = new Map<string, (typeof groups)[number][1][number]>()

      groups.forEach(([, users]) => {
        users.forEach((user) => {
          dedupedUsers.set(user.id, user)
        })
      })

      return Array.from(dedupedUsers.values())
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: UserAction }) => {
      if (action === 'approve') {
        await adminService.approveUser(userId)
        return 'User approved.'
      }

      if (action === 'ban') {
        await adminService.banUser(userId)
        return 'User banned.'
      }

      await adminService.promoteUserToAdmin(userId)
      return 'User promoted to admin.'
    },
  })

  const users = usersQuery.data ?? []
  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        statusFilter === 'All' ? true : matchesAdminFilter(user.status, statusFilter, 'user'),
      ),
    [statusFilter, users],
  )

  const pendingCount = users.filter((user) => matchesAdminFilter(user.status, 'pending', 'user')).length
  const bannedCount = users.filter((user) => matchesAdminFilter(user.status, 'banned', 'user')).length
  const adminCount = users.filter((user) => isAdminRole(user.role)).length

  const handleAction = async (userId: string, action: UserAction) => {
    try {
      const resultMessage = await actionMutation.mutateAsync({ userId, action })
      setActionError(null)
      setActionMessage(resultMessage)
      await queryClient.invalidateQueries({ queryKey: ['admin-users-registry'] })
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to update user status.'))
    }
  }

  return (
    <AdminPanelShell
      title="User registry"
      description="A single admin directory for every account with moderation status, role, identity fields, and creation metadata."
      summary={[
        {
          label: 'All users',
          value: usersQuery.data?.length ?? '--',
          hint: 'Unique accounts collected across all moderation states',
          tone: 'blue',
        },
        {
          label: 'Pending review',
          value: usersQuery.data ? pendingCount : '--',
          hint: 'New accounts waiting for manual approval',
          tone: 'amber',
        },
        {
          label: 'Admins',
          value: usersQuery.data ? adminCount : '--',
          hint: 'Accounts with elevated control permissions',
          tone: 'cyan',
        },
        {
          label: 'Banned',
          value: usersQuery.data ? bannedCount : '--',
          hint: 'Restricted accounts currently blocked from access',
          tone: 'emerald',
        },
      ]}
      toolbar={
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-[0_18px_28px_-28px_rgba(15,23,42,0.9)]">
          <label className="block text-sm font-semibold text-slate-700">
            Status filter
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AdminFilterValue<AdminUserStatus>)}
              className="fin-input mt-2"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Use All to inspect the complete registry or narrow the list to a moderation queue.
          </p>
        </div>
      }
    >
      {usersQuery.isLoading ? (
        <article className="fin-card p-6 text-sm text-slate-600 md:p-8">Loading user registry...</article>
      ) : null}

      {usersQuery.isError ? (
        <article className="fin-card p-6 md:p-8">
          <p className="text-sm font-medium text-rose-700">
            {getApiErrorMessage(usersQuery.error, 'Failed to load users.')}
          </p>
        </article>
      ) : null}

      {actionMessage ? (
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-800">
          {actionMessage}
        </article>
      ) : null}

      {actionError ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-800">
          {actionError}
        </article>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError ? (
        <div className="grid grid-cols-1 gap-5">
          <article className="fin-card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6 md:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Directory table
                </p>
                <h2 className="fin-title mt-2 text-xl font-bold">All user records</h2>
                <p className="fin-subtitle mt-2 text-sm">
                  Columns are grouped around identity, access control, and lifecycle details.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Visible rows</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{filteredUsers.length}</p>
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5 xl:hidden">
              {filteredUsers.map((user) => {
                const nickname = getAdminUserNickname(user)
                const avatar = buildAdminAvatar(user.id, user.fullName, user.email)

                return (
                  <article key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.9)]">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase"
                        style={{ backgroundColor: avatar.backgroundColor, color: avatar.textColor }}
                        aria-label={`Avatar for ${user.fullName}`}
                      >
                        {avatar.initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                            <p className="mt-1 text-xs text-slate-500">{nickname}</p>
                          </div>
                          <span className={getStatusBadgeClass(user.status, 'user')}>
                            {formatAdminLabel(user.status, 'user')}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Email</p>
                            <p className="mt-1 text-sm text-slate-700 break-all">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Created</p>
                            <p className="mt-1 text-sm text-slate-700">{formatAdminDate(user.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">ID</p>
                            <p className="mt-1 font-mono text-xs text-slate-600 break-all">{user.id}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Role</p>
                            <div className="mt-1">
                              <span className={getRoleBadgeClass(user.role ?? 'User')}>
                                {formatAdminLabel(user.role ?? 'User', 'role')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAction(user.id, 'approve')}
                            disabled={actionMutation.isPending}
                            className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleAction(user.id, 'ban')}
                            disabled={actionMutation.isPending}
                            className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Ban
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleAction(user.id, 'promote')}
                            disabled={actionMutation.isPending}
                            className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Promote admin
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="hidden xl:block fin-admin-table-wrap">
              <table className="fin-admin-table table-fixed">
                <colgroup>
                  <col className="w-[27%]" />
                  <col className="w-[26%]" />
                  <col className="w-[16%]" />
                  <col className="w-[13%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Profile</th>
                    <th>Created</th>
                    <th>Access</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const nickname = getAdminUserNickname(user)
                    const avatar = buildAdminAvatar(user.id, user.fullName, user.email)

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase"
                              style={{ backgroundColor: avatar.backgroundColor, color: avatar.textColor }}
                              aria-label={`Avatar for ${user.fullName}`}
                            >
                              {avatar.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
                              <p className="truncate text-xs text-slate-500">Nickname: {nickname}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Email
                              </p>
                              <p className="mt-1 break-all text-sm text-slate-700">{user.email}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                ID
                              </p>
                              <p className="mt-1 font-mono text-xs text-slate-600">{truncateMiddle(user.id)}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <p className="text-sm text-slate-700">{formatAdminDate(user.createdAt)}</p>
                            <p className="mt-1 text-xs text-slate-500">Account creation time</p>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col items-start gap-2">
                            <span className={getStatusBadgeClass(user.status, 'user')}>
                              {formatAdminLabel(user.status, 'user')}
                            </span>
                            <span className={getRoleBadgeClass(user.role ?? 'User')}>
                              {formatAdminLabel(user.role ?? 'User', 'role')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex max-w-[10rem] flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => void handleAction(user.id, 'approve')}
                              disabled={actionMutation.isPending}
                              className="fin-btn-secondary w-full px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleAction(user.id, 'ban')}
                              disabled={actionMutation.isPending}
                              className="fin-btn-secondary w-full px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Ban
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleAction(user.id, 'promote')}
                              disabled={actionMutation.isPending}
                              className="fin-btn-secondary w-full px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Promote admin
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </article>

          {filteredUsers.length === 0 ? (
            <article className="fin-card p-6 md:p-8">
              <p className="text-sm text-slate-600">No users found for the selected filter.</p>
            </article>
          ) : null}
        </div>
      ) : null}
    </AdminPanelShell>
  )
}
