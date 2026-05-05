import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  adminAuctionStatuses,
  adminCommentStatuses,
  adminUserStatuses,
  formatAdminCurrency,
} from '../../features/admin/lib/adminPresentation'
import { AdminPanelShell } from '../../features/admin/ui/AdminPanelShell'
import { adminService } from '../../services/adminService'
import { getApiErrorMessage } from '../../shared/lib/apiError'

export function AdminDashboardPage() {
  const overviewQuery = useQuery({
    queryKey: ['admin-dashboard-overview'],
    queryFn: async () => {
      const [userGroups, commentGroups, auctionGroups] = await Promise.all([
        Promise.all(adminUserStatuses.map(async (status) => [status, await adminService.getUsers(status)] as const)),
        Promise.all(
          adminCommentStatuses.map(async (status) => [status, await adminService.getComments(status)] as const),
        ),
        Promise.all(
          adminAuctionStatuses.map(async (status) => [status, await adminService.getAuctions(status)] as const),
        ),
      ])

      const usersByStatus = Object.fromEntries(userGroups)
      const commentsByStatus = Object.fromEntries(commentGroups)
      const auctionsByStatus = Object.fromEntries(auctionGroups)
      const allAuctions = adminAuctionStatuses.flatMap((status) => auctionsByStatus[status] ?? [])
      const liveAuctionValue = allAuctions.reduce(
        (total, auction) => total + (auction.currentPrice ?? 0),
        0,
      )

      return {
        usersByStatus,
        commentsByStatus,
        auctionsByStatus,
        liveAuctionValue,
      }
    },
  })

  const usersByStatus = overviewQuery.data?.usersByStatus
  const commentsByStatus = overviewQuery.data?.commentsByStatus
  const auctionsByStatus = overviewQuery.data?.auctionsByStatus

  return (
    <AdminPanelShell
      title="Admin operations hub"
      description="Monitor user onboarding, comment moderation, and auction execution from one organized control surface."
      summary={[
        {
          label: 'Pending users',
          value: usersByStatus?.Pending.length ?? '--',
          hint: 'Accounts waiting for moderation approval',
          tone: 'amber',
        },
        {
          label: 'Pending comments',
          value: commentsByStatus?.Pending.length ?? '--',
          hint: 'Community items still in review',
          tone: 'cyan',
        },
        {
          label: 'Active auctions',
          value: auctionsByStatus?.Active.length ?? '--',
          hint: 'Currently trading lots in the marketplace',
          tone: 'emerald',
        },
        {
          label: 'Marketplace volume',
          value: overviewQuery.data ? formatAdminCurrency(overviewQuery.data.liveAuctionValue) : '--',
          hint: 'Current visible auction value across statuses',
          tone: 'blue',
        },
      ]}
    >
      {overviewQuery.isLoading ? (
        <article className="fin-card p-6 text-sm text-slate-600 md:p-8">Loading admin overview...</article>
      ) : null}

      {overviewQuery.isError ? (
        <article className="fin-card p-6 md:p-8">
          <p className="text-sm font-medium text-rose-700">
            {getApiErrorMessage(overviewQuery.error, 'Failed to load admin overview.')}
          </p>
        </article>
      ) : null}

      {!overviewQuery.isLoading && !overviewQuery.isError ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="fin-card p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Priority queue
                </p>
                <h2 className="fin-title mt-2 text-xl font-bold">Operational focus</h2>
                <p className="fin-subtitle mt-2 text-sm">
                  These are the queues that usually need the fastest response from the admin team.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                  Users awaiting approval
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-950">
                  {usersByStatus?.Pending.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-amber-900/80">
                  Review new registrations, confirm trust, and open access.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                  Comments in moderation
                </p>
                <p className="mt-2 text-3xl font-bold text-cyan-950">
                  {commentsByStatus?.Pending.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-cyan-900/80">
                  Keep public auction threads clean and professionally curated.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  Draft auctions
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">
                  {auctionsByStatus?.Draft.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-emerald-900/80">
                  Publish prepared lots or send them back for correction.
                </p>
              </div>
            </div>
          </article>

          <article className="fin-card p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Quick access
            </p>
            <h2 className="fin-title mt-2 text-xl font-bold">Navigate by workflow</h2>
            <div className="mt-5 space-y-3">
              <Link to="/admin/users" className="block rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-blue-200 hover:bg-white">
                <p className="text-sm font-semibold text-slate-900">User registry</p>
                <p className="mt-1 text-sm text-slate-600">
                  Browse all accounts with id, nickname, email, creation time, and role actions.
                </p>
              </Link>

              <Link to="/admin/comments" className="block rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-blue-200 hover:bg-white">
                <p className="text-sm font-semibold text-slate-900">Comment moderation</p>
                <p className="mt-1 text-sm text-slate-600">
                  Review pending feedback and resolve problematic discussion threads.
                </p>
              </Link>

              <Link to="/admin/auctions" className="block rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-blue-200 hover:bg-white">
                <p className="text-sm font-semibold text-slate-900">Auction lifecycle</p>
                <p className="mt-1 text-sm text-slate-600">
                  Move lots through draft, active, and finished states while maintaining catalog data.
                </p>
              </Link>
            </div>
          </article>
        </div>
      ) : null}
    </AdminPanelShell>
  )
}
