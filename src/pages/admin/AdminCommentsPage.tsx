import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { AdminCommentStatus } from '../../features/admin/model/admin.types'
import { adminService } from '../../services/adminService'
import { getApiErrorMessage } from '../../shared/lib/apiError'

const statuses: AdminCommentStatus[] = ['Pending', 'Approved', 'Rejected']

type CommentAction = 'approve' | 'reject'

// Admin page to review and moderate auction comments.
export function AdminCommentsPage() {
  const [status, setStatus] = useState<AdminCommentStatus>('Pending')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const commentsQuery = useQuery({
    queryKey: ['admin-comments', status],
    queryFn: () => adminService.getComments(status),
  })

  const actionMutation = useMutation({
    mutationFn: async ({
      commentId,
      action,
    }: {
      commentId: string
      action: CommentAction
    }) => {
      if (action === 'approve') {
        await adminService.approveComment(commentId)
        return 'Comment approved.'
      }

      await adminService.rejectComment(commentId)
      return 'Comment rejected.'
    },
  })

  const handleAction = async (commentId: string, action: CommentAction) => {
    try {
      const message = await actionMutation.mutateAsync({ commentId, action })
      setActionError(null)
      setActionMessage(message)
      await queryClient.invalidateQueries({ queryKey: ['admin-comments', status] })
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to moderate comment.'))
    }
  }

  return (
    <section className="fin-fade-up space-y-5">
      <article className="fin-card p-6 md:p-8">
        <h1 className="fin-title text-2xl font-bold">Admin - Comments</h1>
        <p className="fin-subtitle mt-2 text-sm">Approve or reject comment submissions.</p>

        <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-700">
          Filter by status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AdminCommentStatus)}
            className="fin-input mt-1.5"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {commentsQuery.isLoading ? <p className="mt-4 text-sm text-slate-600">Loading comments...</p> : null}
        {commentsQuery.isError ? (
          <p className="mt-4 text-sm font-medium text-rose-700">
            {getApiErrorMessage(commentsQuery.error, 'Failed to load comments.')}
          </p>
        ) : null}

        {actionMessage ? <p className="mt-4 text-sm font-medium text-emerald-700">{actionMessage}</p> : null}
        {actionError ? <p className="mt-2 text-sm font-medium text-rose-700">{actionError}</p> : null}
      </article>

      {!commentsQuery.isLoading && !commentsQuery.isError ? (
        <div className="space-y-3">
          {(commentsQuery.data ?? []).map((comment) => (
            <article key={comment.id} className="fin-card p-5">
              <p className="text-sm text-slate-900">{comment.content}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                Status: {comment.status} | User: {comment.userFullName ?? 'Unknown'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleAction(comment.id, 'approve')}
                  disabled={actionMutation.isPending}
                  className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void handleAction(comment.id, 'reject')}
                  disabled={actionMutation.isPending}
                  className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}

          {(commentsQuery.data ?? []).length === 0 ? (
            <article className="fin-card p-5">
              <p className="text-sm text-slate-600">No comments found for this status.</p>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
