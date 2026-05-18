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
  type AdminFilterValue,
} from '../../features/admin/lib/adminPresentation'
import { AdminPanelShell } from '../../features/admin/ui/AdminPanelShell'
import { adminService } from '../../services/adminService'
import { getApiErrorMessage } from '../../shared/lib/apiError'

const statusOptions: Array<AdminFilterValue<AdminAuctionStatus>> = ['All', ...adminAuctionStatuses]

type AuctionAction = 'activate' | 'finish'

function splitAuctionIdForTable(id: string) {
  const middle = Math.ceil(id.length / 2)

  return {
    firstLine: id.slice(0, middle),
    secondLine: id.slice(middle),
  }
}

export function AdminAuctionsPage() {
  const [statusFilter, setStatusFilter] = useState<AdminFilterValue<AdminAuctionStatus>>('All')
  const [createPayload, setCreatePayload] = useState(
    '{\n  "title": "New auction",\n  "description": "Auction description",\n  "startPrice": 1000,\n  "endTime": "2026-12-31T20:00:00Z"\n}',
  )
  const [updateAuctionId, setUpdateAuctionId] = useState('')
  const [updatePayload, setUpdatePayload] = useState(
    '{\n  "title": "Updated auction",\n  "description": "Updated description",\n  "startPrice": 1500,\n  "endTime": "2026-12-31T20:00:00Z"\n}',
  )
  const [photoAuctionId, setPhotoAuctionId] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null)
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

  const photoUploadMutation = useMutation({
    mutationFn: ({ auctionId, file }: { auctionId: string; file: File }) =>
      adminService.uploadAuctionMainPhoto(auctionId, file),
  })

  const photoDeleteMutation = useMutation({
    mutationFn: (auctionId: string) => adminService.deleteAuctionMainPhoto(auctionId),
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
  const sanitizedPhotoAuctionId = photoAuctionId.replace(/\s+/g, '')
  const selectedAuction = auctions.find((auction) => auction.id === sanitizedPhotoAuctionId)

  const isPhotoMutating = photoUploadMutation.isPending || photoDeleteMutation.isPending

  const refreshCurrentList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-auctions-registry'] })
    await queryClient.invalidateQueries({ queryKey: ['admin-dashboard-overview'] })
    await queryClient.invalidateQueries({ queryKey: ['auctions'] })
    await queryClient.invalidateQueries({ queryKey: ['auction-details'] })
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
      const created = await createMutation.mutateAsync(payload)

      if (createPhotoFile && created.id) {
        try {
          await photoUploadMutation.mutateAsync({ auctionId: created.id, file: createPhotoFile })
          setActionMessage('Auction created and photo uploaded successfully.')
        } catch {
          setActionMessage('Auction created, but photo upload failed. Use the Media panel to retry.')
        }
        setCreatePhotoFile(null)
      } else {
        setActionMessage('Auction created.')
      }

      setActionError(null)
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

  const handleUploadMainPhoto = async () => {
    const normalizedAuctionId = photoAuctionId.replace(/\s+/g, '')

    if (!normalizedAuctionId) {
      setActionMessage(null)
      setActionError('Auction id is required to upload a photo.')
      return
    }

    if (!photoFile) {
      setActionMessage(null)
      setActionError('Select an image file first.')
      return
    }

    try {
      await photoUploadMutation.mutateAsync({
        auctionId: normalizedAuctionId,
        file: photoFile,
      })
      setActionError(null)
      setActionMessage('Main photo uploaded successfully.')
      setPhotoFile(null)
      await refreshCurrentList()
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to upload main photo.'))
    }
  }

  const handleDeleteMainPhoto = async () => {
    const normalizedAuctionId = photoAuctionId.replace(/\s+/g, '')

    if (!normalizedAuctionId) {
      setActionMessage(null)
      setActionError('Auction id is required to delete a photo.')
      return
    }

    try {
      await photoDeleteMutation.mutateAsync(normalizedAuctionId)
      setActionError(null)
      setActionMessage('Main photo deleted successfully.')
      setPhotoFile(null)
      await refreshCurrentList()
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to delete main photo.'))
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
              <table className="fin-admin-table min-w-[1220px]">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>ID</th>
                    <th>Price</th>
                    <th>End time</th>
                    <th>Status</th>
                    <th>Photo</th>
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
                        {(() => {
                          const idRows = splitAuctionIdForTable(auction.id)

                          return (
                            <span className="block max-w-[270px] font-mono text-[11px] leading-5 text-slate-700">
                              <span className="block break-all">{idRows.firstLine}</span>
                              <span className="block break-all">{idRows.secondLine}</span>
                            </span>
                          )
                        })()}
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
                        <div className="flex items-center gap-2">
                          <div className="h-11 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                            {auction.mainImageUrl?.trim() ? (
                              <img
                                src={auction.mainImageUrl}
                                alt={`Main photo for ${auction.title}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="grid h-full place-items-center bg-gradient-to-br from-slate-100 to-slate-200 px-1 text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                                no photo
                              </div>
                            )}
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                            {auction.mainImageUrl?.trim() ? 'Uploaded' : 'Missing'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleLifecycleAction(auction.id, 'activate')}
                            disabled={statusMutation.isPending}
                            className="inline-flex h-6 items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-2 text-[10px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Activate
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleLifecycleAction(auction.id, 'finish')}
                            disabled={statusMutation.isPending}
                            className="inline-flex h-6 items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-2 text-[10px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Finish
                          </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoAuctionId(auction.id)
                              setActionMessage(null)
                              setActionError(null)
                              document.getElementById('media-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="inline-flex h-6 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2 text-[10px] font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100"
                          >
                            Photo
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <article className="fin-card flex h-full flex-col p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Create lot</p>
              <h2 className="fin-title mt-2 text-xl font-bold">Create auction</h2>
              <p className="fin-subtitle mt-2 text-sm">
                Submit a structured JSON payload for a new catalog entry.
              </p>
              <textarea
                value={createPayload}
                onChange={(event) => setCreatePayload(event.target.value)}
                className="fin-input mt-4 min-h-52 flex-1 font-mono text-xs"
              />
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Main photo
                <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="fin-input mt-2"
                  onChange={(event) => setCreatePhotoFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {createPhotoFile ? (
                <p className="mt-1.5 text-xs text-slate-500">Selected: {createPhotoFile.name}</p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">No photo — you can add it later via the Media panel.</p>
              )}
              <button
                type="button"
                onClick={() => void handleCreateAuction()}
                disabled={createMutation.isPending || photoUploadMutation.isPending}
                className="fin-btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending
                  ? 'Creating...'
                  : photoUploadMutation.isPending
                    ? 'Uploading photo...'
                    : createPhotoFile
                      ? 'Create + upload photo'
                      : 'Create auction'}
              </button>
            </article>

            <article className="fin-card flex h-full flex-col p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Update lot</p>
              <h2 className="fin-title mt-2 text-xl font-bold">Update auction</h2>
              <p className="fin-subtitle mt-2 text-sm">
                Provide an auction id and JSON body to update an existing catalog record.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Main photo is not part of this JSON and is updated in the Media panel.
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
                className="fin-input mt-4 min-h-44 flex-1 font-mono text-xs"
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

            <article id="media-panel" className="fin-card p-6 md:p-8 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Media</p>
              <h2 className="fin-title mt-2 text-xl font-bold">Manage main photo</h2>
              <p className="fin-subtitle mt-2 text-sm">
                Upload a new image to set or replace the current main photo, or delete it for the selected auction.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Auction id
                    <input
                      value={photoAuctionId}
                      onChange={(event) => setPhotoAuctionId(event.target.value.replace(/\s+/g, ''))}
                      className="fin-input mt-2 font-mono text-xs"
                      placeholder="auction-guid"
                    />
                  </label>

                  <label className="mt-4 block text-sm font-semibold text-slate-700">
                    Photo file
                    <input
                      type="file"
                      accept="image/*"
                      className="fin-input mt-2"
                      onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  <p className="mt-2 text-xs text-slate-500">
                    {photoFile ? `Selected: ${photoFile.name}` : 'No file selected'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUploadMainPhoto()}
                      disabled={isPhotoMutating}
                      className="fin-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {photoUploadMutation.isPending ? 'Uploading...' : 'Upload / replace'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteMainPhoto()}
                      disabled={isPhotoMutating}
                      className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {photoDeleteMutation.isPending ? 'Deleting...' : 'Delete photo'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">Current photo</p>
                  <div className="mt-2 h-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {selectedAuction?.mainImageUrl?.trim() ? (
                      <img
                        src={selectedAuction.mainImageUrl}
                        alt={`Current photo for ${selectedAuction.title}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center px-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Current photo is missing
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </AdminPanelShell>
  )
}
