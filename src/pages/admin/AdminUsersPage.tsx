import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { AdminUserStatus } from '../../features/admin/model/admin.types'
import { adminService } from '../../services/adminService'
import { getApiErrorMessage } from '../../shared/lib/apiError'

const statuses: AdminUserStatus[] = ['Pending', 'Approved', 'Banned']

type UserAction = 'approve' | 'ban' | 'promote'

// Admin page to moderate users and change their status/role.
export function AdminUsersPage() {
  const [status, setStatus] = useState<AdminUserStatus>('Pending')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ['admin-users', status],
    queryFn: () => adminService.getUsers(status),
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

  const handleAction = async (userId: string, action: UserAction) => {
    try {
      const resultMessage = await actionMutation.mutateAsync({ userId, action })
      setActionError(null)
      setActionMessage(resultMessage)
      await queryClient.invalidateQueries({ queryKey: ['admin-users', status] })
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to update user status.'))
    }
  }

  return (
    <section className="fin-fade-up space-y-5">
      <article className="fin-card p-6 md:p-8">
        <h1 className="fin-title text-2xl font-bold">Admin - Users</h1>
        <p className="fin-subtitle mt-2 text-sm">Manage user moderation and admin privileges.</p>

        <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-700">
          Filter by status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AdminUserStatus)}
            className="fin-input mt-1.5"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {usersQuery.isLoading ? <p className="mt-4 text-sm text-slate-600">Loading users...</p> : null}
        {usersQuery.isError ? (
          <p className="mt-4 text-sm font-medium text-rose-700">
            {getApiErrorMessage(usersQuery.error, 'Failed to load users.')}
          </p>
        ) : null}

        {actionMessage ? <p className="mt-4 text-sm font-medium text-emerald-700">{actionMessage}</p> : null}
        {actionError ? <p className="mt-2 text-sm font-medium text-rose-700">{actionError}</p> : null}
      </article>

      {!usersQuery.isLoading && !usersQuery.isError ? (
        <div className="space-y-3">
          {(usersQuery.data ?? []).map((user) => (
            <article key={user.id} className="fin-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                  <p className="text-sm text-slate-600">{user.email}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Status: {user.status} | Role: {user.role ?? 'User'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
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
                    Promote Admin
                  </button>
                </div>
              </div>
            </article>
          ))}

          {(usersQuery.data ?? []).length === 0 ? (
            <article className="fin-card p-5">
              <p className="text-sm text-slate-600">No users found for this status.</p>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
