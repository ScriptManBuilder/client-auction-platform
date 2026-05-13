import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { AdminCommentStatus } from '../../features/admin/model/admin.types'
import {
  adminCommentStatuses,
  formatAdminLabel,
  formatAdminDate,
  getStatusBadgeClass,
  matchesAdminFilter,
  truncateMiddle,
  type AdminFilterValue,
} from '../../features/admin/lib/adminPresentation'
import { AdminPanelShell } from '../../features/admin/ui/AdminPanelShell'
import { adminService } from '../../services/adminService'
import { getApiErrorMessage } from '../../shared/lib/apiError'

const statusOptions: Array<AdminFilterValue<AdminCommentStatus>> = ['All', ...adminCommentStatuses]

type CommentAction = 'approve' | 'reject'
const COMMENT_PREVIEW_LENGTH = 220

export function AdminCommentsPage() {
  const [statusFilter, setStatusFilter] = useState<AdminFilterValue<AdminCommentStatus>>('All')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [expandedCommentIds, setExpandedCommentIds] = useState<string[]>([])
  const queryClient = useQueryClient()

  const commentsQuery = useQuery({
    queryKey: ['admin-comments-registry'],
    queryFn: async () => {
      const groups = await Promise.all(
        adminCommentStatuses.map(async (status) => [status, await adminService.getComments(status)] as const),
      )

      const dedupedComments = new Map<string, (typeof groups)[number][1][number]>()

      groups.forEach(([, comments]) => {
        comments.forEach((comment) => {
          dedupedComments.set(comment.id, comment)
        })
      })

      return Array.from(dedupedComments.values())
    },
  })

  const actionMutation = useMutation({
    mutationFn: async ({ commentId, action }: { commentId: string; action: CommentAction }) => {
      if (action === 'approve') {
        await adminService.approveComment(commentId)
        return 'Comment approved.'
      }

      await adminService.rejectComment(commentId)
      return 'Comment rejected.'
    },
  })

  const comments = useMemo(() => commentsQuery.data ?? [], [commentsQuery.data])
  const filteredComments = useMemo(
    () =>
      comments.filter((comment) =>
        statusFilter === 'All' ? true : matchesAdminFilter(comment.status, statusFilter, 'comment'),
      ),
    [comments, statusFilter],
  )

  const pendingCount = comments.filter((comment) => matchesAdminFilter(comment.status, 'pending', 'comment')).length
  const approvedCount = comments.filter((comment) => matchesAdminFilter(comment.status, 'approved', 'comment')).length
  const rejectedCount = comments.filter((comment) => matchesAdminFilter(comment.status, 'rejected', 'comment')).length

  const handleAction = async (commentId: string, action: CommentAction) => {
    try {
      const message = await actionMutation.mutateAsync({ commentId, action })
      setActionError(null)
      setActionMessage(message)
      await queryClient.invalidateQueries({ queryKey: ['admin-comments-registry'] })
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to moderate comment.'))
    }
  }

  const toggleCommentExpanded = (commentId: string) => {
    setExpandedCommentIds((currentIds) =>
      currentIds.includes(commentId)
        ? currentIds.filter((currentId) => currentId !== commentId)
        : [...currentIds, commentId],
    )
  }

  return (
    <AdminPanelShell
      title="Comment moderation"
      description="Review every comment in one queue, grouped by moderation status and linked back to the auction discussion."
      summary={[
        {
          label: 'All comments',
          value: commentsQuery.data?.length ?? '--',
          hint: 'Total comments loaded into the moderation registry',
          tone: 'blue',
        },
        {
          label: 'Pending',
          value: commentsQuery.data ? pendingCount : '--',
          hint: 'Items that still need a moderation decision',
          tone: 'amber',
        },
        {
          label: 'Approved',
          value: commentsQuery.data ? approvedCount : '--',
          hint: 'Visible comments already accepted',
          tone: 'emerald',
        },
        {
          label: 'Rejected',
          value: commentsQuery.data ? rejectedCount : '--',
          hint: 'Comments blocked from public discussion',
          tone: 'cyan',
        },
      ]}
      toolbar={
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-[0_18px_28px_-28px_rgba(15,23,42,0.9)]">
          <label className="block text-sm font-semibold text-slate-700">
            Moderation filter
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AdminFilterValue<AdminCommentStatus>)}
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
            Switch between the pending queue and the full archive without leaving the page.
          </p>
        </div>
      }
    >
      {commentsQuery.isLoading ? (
        <article className="fin-card p-6 text-sm text-slate-600 md:p-8">Loading comment moderation queue...</article>
      ) : null}

      {commentsQuery.isError ? (
        <article className="fin-card p-6 md:p-8">
          <p className="text-sm font-medium text-rose-700">
            {getApiErrorMessage(commentsQuery.error, 'Failed to load comments.')}
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

      {!commentsQuery.isLoading && !commentsQuery.isError ? (
        <article className="fin-card overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6 md:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Review table
              </p>
              <h2 className="fin-title mt-2 text-xl font-bold">Comment decisions</h2>
              <p className="fin-subtitle mt-2 text-sm">
                Every row gives you content, source auction, author label, creation time, and moderation controls.
              </p>
            </div>
          </div>

          <div className="fin-admin-table-wrap">
            <table className="fin-admin-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Comment</th>
                  <th>Comment ID</th>
                  <th>Auction ID</th>
                  <th>Author</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComments.map((comment) => (
                  <tr key={comment.id}>
                    <td>
                      <div className="max-w-[320px]">
                        {(() => {
                          const isExpanded = expandedCommentIds.includes(comment.id)
                          const isLongComment = comment.content.length > COMMENT_PREVIEW_LENGTH
                          const previewContent = isLongComment
                            ? `${comment.content.slice(0, COMMENT_PREVIEW_LENGTH).trimEnd()}...`
                            : comment.content

                          return (
                            <>
                              <p className="whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
                                {isExpanded ? comment.content : previewContent}
                              </p>
                              {isLongComment ? (
                                <button
                                  type="button"
                                  onClick={() => toggleCommentExpanded(comment.id)}
                                  className="mt-2 text-xs font-semibold text-sky-700 transition hover:text-sky-900"
                                >
                                  {isExpanded ? 'Show less' : 'Show more'}
                                </button>
                              ) : null}
                            </>
                          )
                        })()}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-600">{truncateMiddle(comment.id)}</span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-600">{truncateMiddle(comment.auctionId)}</span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-700">{comment.userFullName ?? 'Unknown user'}</span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-700">{formatAdminDate(comment.createdAt)}</span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(comment.status, 'comment')}>
                        {formatAdminLabel(comment.status, 'comment')}
                      </span>
                    </td>
                    <td>
                      <div className="flex min-w-[180px] flex-wrap gap-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredComments.length === 0 ? (
            <div className="border-t border-slate-200 px-5 py-6 text-sm text-slate-600 sm:px-6 md:px-8">
              No comments found for the selected filter.
            </div>
          ) : null}
        </article>
      ) : null}
    </AdminPanelShell>
  )
}
