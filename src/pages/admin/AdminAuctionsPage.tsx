import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { AdminAuctionStatus } from '../../features/admin/model/admin.types'
import { adminService } from '../../services/adminService'
import { getApiErrorMessage } from '../../shared/lib/apiError'

const statuses: AdminAuctionStatus[] = ['Draft', 'Active', 'Finished']

type AuctionAction = 'activate' | 'finish'

// Admin page for auction moderation and lifecycle actions.
export function AdminAuctionsPage() {
  const [status, setStatus] = useState<AdminAuctionStatus>('Draft')
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
    queryKey: ['admin-auctions', status],
    queryFn: () => adminService.getAuctions(status),
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      auctionId,
      action,
    }: {
      auctionId: string
      action: AuctionAction
    }) => {
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
    mutationFn: ({
      auctionId,
      payload,
    }: {
      auctionId: string
      payload: Record<string, unknown>
    }) => adminService.updateAuction(auctionId, payload),
  })

  const refreshCurrentList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-auctions', status] })
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
    <section className="fin-fade-up space-y-5">
      <article className="fin-card p-6 md:p-8">
        <h1 className="fin-title text-2xl font-bold">Admin - Auctions</h1>
        <p className="fin-subtitle mt-2 text-sm">Manage auction lifecycle and moderation operations.</p>

        <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-700">
          Filter by status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AdminAuctionStatus)}
            className="fin-input mt-1.5"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {auctionsQuery.isLoading ? <p className="mt-4 text-sm text-slate-600">Loading auctions...</p> : null}
        {auctionsQuery.isError ? (
          <p className="mt-4 text-sm font-medium text-rose-700">
            {getApiErrorMessage(auctionsQuery.error, 'Failed to load auctions.')}
          </p>
        ) : null}

        {actionMessage ? <p className="mt-4 text-sm font-medium text-emerald-700">{actionMessage}</p> : null}
        {actionError ? <p className="mt-2 text-sm font-medium text-rose-700">{actionError}</p> : null}
      </article>

      {!auctionsQuery.isLoading && !auctionsQuery.isError ? (
        <div className="space-y-3">
          {(auctionsQuery.data ?? []).map((auction) => (
            <article key={auction.id} className="fin-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{auction.title}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Status: {auction.status}
                  </p>
                  <p className="text-xs text-slate-500">ID: {auction.id}</p>
                </div>

                <div className="flex flex-wrap gap-2">
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
              </div>
            </article>
          ))}

          {(auctionsQuery.data ?? []).length === 0 ? (
            <article className="fin-card p-5">
              <p className="text-sm text-slate-600">No auctions found for this status.</p>
            </article>
          ) : null}
        </div>
      ) : null}

      <article className="fin-card p-6 md:p-8">
        <h2 className="fin-title text-xl font-bold">Create Auction</h2>
        <p className="fin-subtitle mt-2 text-sm">
          Enter a JSON payload for POST /api/admin/auctions.
        </p>
        <textarea
          value={createPayload}
          onChange={(event) => setCreatePayload(event.target.value)}
          className="fin-input mt-3 min-h-40 font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => void handleCreateAuction()}
          disabled={createMutation.isPending}
          className="fin-btn-primary mt-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Auction'}
        </button>
      </article>

      <article className="fin-card p-6 md:p-8">
        <h2 className="fin-title text-xl font-bold">Update Auction</h2>
        <p className="fin-subtitle mt-2 text-sm">
          Enter auction id and payload for PUT /api/admin/auctions/{'{id}'}. 
        </p>

        <label className="mt-3 block text-sm font-semibold text-slate-700">
          Auction id
          <input
            value={updateAuctionId}
            onChange={(event) => setUpdateAuctionId(event.target.value)}
            className="fin-input mt-1.5"
            placeholder="auction-guid"
          />
        </label>

        <textarea
          value={updatePayload}
          onChange={(event) => setUpdatePayload(event.target.value)}
          className="fin-input mt-3 min-h-40 font-mono text-xs"
        />

        <button
          type="button"
          onClick={() => void handleUpdateAuction()}
          disabled={updateMutation.isPending}
          className="fin-btn-primary mt-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateMutation.isPending ? 'Updating...' : 'Update Auction'}
        </button>
      </article>
    </section>
  )
}
