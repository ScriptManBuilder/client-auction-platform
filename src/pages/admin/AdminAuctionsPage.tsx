import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { AdminAuctionStatus } from '../../features/admin/model/admin.types'
import {
  adminAuctionStatuses,
  formatAdminLabel,
  formatAdminCurrency,
  formatAdminDate,
  getStatusBadgeClass,
  matchesAdminFilter,
  truncateMiddle,
  type AdminFilterValue,
} from '../../features/admin/lib/adminPresentation'
import { AdminPanelShell } from '../../features/admin/ui/AdminPanelShell'
import { adminService } from '../../services/adminService'
import { getApiErrorMessage } from '../../shared/lib/apiError'

const statusOptions: Array<AdminFilterValue<AdminAuctionStatus>> = ['All', ...adminAuctionStatuses]

type AuctionAction = 'activate' | 'finish'

export function AdminAuctionsPage() {
  const [statusFilter, setStatusFilter] = useState<AdminFilterValue<AdminAuctionStatus>>('All')
  const [createPayload, setCreatePayload] = useState(
    '{\n  "title": "New auction",\n  "description": "Auction description",\n  "startPrice": 1000,\n  "endTime": "2026-12-31T20:00:00Z"\n}',
  )
  const [updateAuctionId, setUpdateAuctionId] = useState('')
  const [updatePayload, setUpdatePayload] = useState(
    '{\n  "title": "Updated auction",\n  "description": "Updated description",\n  "startPrice": 1500,\n  "endTime": "2026-12-31T20:00:00Z"\n}',
  )
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const auctionsQuery = useQuery({
    queryKey: ['admin-auctions-registry'],
    queryFn: async () => {
      const groups = await Promise.all(
        adminAuctionStatuses.map(async (status) => [status, await adminService.getAuctions(status)] as const),
      )

      const dedupedAuctions = new Map<string, (typeof groups)[number][1][number]>()

      groups.forEach(([, auctions]) => {
        auctions.forEach((auction) => {
          dedupedAuctions.set(auction.id, auction)
        })
      })

      return Array.from(dedupedAuctions.values())
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ auctionId, action }: { auctionId: string; action: AuctionAction }) => {
      if (action === 'activate') {
        await adminService.activateAuction(auctionId)
        return 'Auction activated.'
      }

      await adminService.finishAuction(auctionId)
      return 'Auction finished.'
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminService.createAuction(payload),
  })

  const updateMutation = useMutation({
    mutationFn: ({ auctionId, payload }: { auctionId: string; payload: Record<string, unknown> }) =>
      adminService.updateAuction(auctionId, payload),
  })

  const auctions = auctionsQuery.data ?? []
  const filteredAuctions = useMemo(
    () =>
      auctions.filter((auction) =>
        statusFilter === 'All' ? true : matchesAdminFilter(auction.status, statusFilter, 'auction'),
      ),
    [auctions, statusFilter],
  )

  const draftCount = auctions.filter((auction) => matchesAdminFilter(auction.status, 'draft', 'auction')).length
  const activeCount = auctions.filter((auction) => matchesAdminFilter(auction.status, 'active', 'auction')).length
  const finishedCount = auctions.filter((auction) => matchesAdminFilter(auction.status, 'finished', 'auction')).length

  const refreshCurrentList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-auctions-registry'] })
    await queryClient.invalidateQueries({ queryKey: ['admin-dashboard-overview'] })
  }

  const handleLifecycleAction = async (auctionId: string, action: AuctionAction) => {
    try {
      const result = await statusMutation.mutateAsync({ auctionId, action })
      setActionError(null)
      setActionMessage(result)
      await refreshCurrentList()
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to update auction status.'))
    }
  }

  const handleCreateAuction = async () => {
    try {
      const payload = JSON.parse(createPayload) as Record<string, unknown>
      await createMutation.mutateAsync(payload)
      setActionError(null)
      setActionMessage('Auction created.')
      await refreshCurrentList()
    } catch (error) {
      const fallback = 'Failed to create auction.'
      const parseFallback = error instanceof Error ? error.message : fallback
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, parseFallback))
    }
  }

  const handleUpdateAuction = async () => {
    if (!updateAuctionId.trim()) {
      setActionMessage(null)
      setActionError('Auction id is required for update.')
      return
    }

    try {
      const payload = JSON.parse(updatePayload) as Record<string, unknown>
      await updateMutation.mutateAsync({
        auctionId: updateAuctionId.trim(),
        payload,
      })
      setActionError(null)
      setActionMessage('Auction updated.')
      await refreshCurrentList()
    } catch (error) {
      const fallback = 'Failed to update auction.'
      const parseFallback = error instanceof Error ? error.message : fallback
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, parseFallback))
    }
  }

  return (
    <AdminPanelShell
      title="Auction operations"
      description="Manage the auction catalog through a cleaner flow: inspect the registry, then create, update, activate, or finish lots from dedicated sections."
      summary={[
        {
          label: 'All auctions',
          value: auctionsQuery.data?.length ?? '--',
          hint: 'Current catalog entries loaded into the admin registry',
          tone: 'blue',
        },
        {
          label: 'Draft',
          value: auctionsQuery.data ? draftCount : '--',
          hint: 'Lots waiting for publication or review',
          tone: 'amber',
        },
        {
          label: 'Active',
          value: auctionsQuery.data ? activeCount : '--',
          hint: 'Live auctions currently available to traders',
          tone: 'emerald',
        },
        {
          label: 'Finished',
          value: auctionsQuery.data ? finishedCount : '--',
          hint: 'Closed lots that already completed their lifecycle',
          tone: 'cyan',
        },
      ]}
      toolbar={
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-[0_18px_28px_-28px_rgba(15,23,42,0.9)]">
          <label className="block text-sm font-semibold text-slate-700">
            Lifecycle filter
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AdminFilterValue<AdminAuctionStatus>)}
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
            Review all auction stages from one screen and keep operations grouped by lifecycle state.
          </p>
        </div>
      }
    >
      {auctionsQuery.isLoading ? (
        <article className="fin-card p-6 text-sm text-slate-600 md:p-8">Loading auction operations...</article>
      ) : null}

      {auctionsQuery.isError ? (
        <article className="fin-card p-6 md:p-8">
          <p className="text-sm font-medium text-rose-700">
            {getApiErrorMessage(auctionsQuery.error, 'Failed to load auctions.')}
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

      {!auctionsQuery.isLoading && !auctionsQuery.isError ? (
        <div className="grid grid-cols-1 gap-5">
          <article className="fin-card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6 md:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Registry table
                </p>
                <h2 className="fin-title mt-2 text-xl font-bold">Auction directory</h2>
                <p className="fin-subtitle mt-2 text-sm">
                  Review ids, lifecycle status, value, and scheduled end dates before taking any action.
                </p>
              </div>
            </div>

            <div className="fin-admin-table-wrap">
              <table className="fin-admin-table min-w-[920px]">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>ID</th>
                    <th>Price</th>
                    <th>End time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuctions.map((auction) => (
                    <tr key={auction.id}>
                      <td>
                        <div className="max-w-[260px]">
                          <p className="text-sm font-semibold text-slate-900">{auction.title}</p>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-600">{truncateMiddle(auction.id)}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-700">{formatAdminCurrency(auction.currentPrice)}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-700">{formatAdminDate(auction.endTime)}</span>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(auction.status, 'auction')}>
                          {formatAdminLabel(auction.status, 'auction')}
                        </span>
                      </td>
                      <td>
                        <div className="flex min-w-[180px] flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleLifecycleAction(auction.id, 'activate')}
                            disabled={statusMutation.isPending}
                            className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Activate
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleLifecycleAction(auction.id, 'finish')}
                            disabled={statusMutation.isPending}
                            className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Finish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAuctions.length === 0 ? (
              <div className="border-t border-slate-200 px-5 py-6 text-sm text-slate-600 sm:px-6 md:px-8">
                No auctions found for the selected filter.
              </div>
            ) : null}
          </article>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <article className="fin-card p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Create lot</p>
              <h2 className="fin-title mt-2 text-xl font-bold">Create auction</h2>
              <p className="fin-subtitle mt-2 text-sm">
                Submit a structured JSON payload for a new catalog entry.
              </p>
              <textarea
                value={createPayload}
                onChange={(event) => setCreatePayload(event.target.value)}
                className="fin-input mt-4 min-h-52 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => void handleCreateAuction()}
                disabled={createMutation.isPending}
                className="fin-btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending ? 'Creating...' : 'Create auction'}
              </button>
            </article>

            <article className="fin-card p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Update lot</p>
              <h2 className="fin-title mt-2 text-xl font-bold">Update auction</h2>
              <p className="fin-subtitle mt-2 text-sm">
                Provide an auction id and JSON body to update an existing catalog record.
              </p>

              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Auction id
                <input
                  value={updateAuctionId}
                  onChange={(event) => setUpdateAuctionId(event.target.value)}
                  className="fin-input mt-2"
                  placeholder="auction-guid"
                />
              </label>

              <textarea
                value={updatePayload}
                onChange={(event) => setUpdatePayload(event.target.value)}
                className="fin-input mt-4 min-h-44 font-mono text-xs"
              />

              <button
                type="button"
                onClick={() => void handleUpdateAuction()}
                disabled={updateMutation.isPending}
                className="fin-btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update auction'}
              </button>
            </article>
          </div>
        </div>
      ) : null}
    </AdminPanelShell>
  )
}
