import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../features/auth/model/authStore'
import { auctionService } from '../services/auctionService'
import { getApiErrorMessage } from '../shared/lib/apiError'

// Shows one auction and allows authenticated users to bid, comment, and react.
export function AuctionDetailsPage() {
  const { id: auctionId } = useParams()
  const queryClient = useQueryClient()
  const isAuthenticated = Boolean(useAuthStore((state) => state.accessToken))

  const [bidAmount, setBidAmount] = useState('')
  const [comment, setComment] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const auctionQuery = useQuery({
    queryKey: ['auction-details', auctionId],
    queryFn: async () => {
      if (!auctionId) {
        throw new Error('Auction id is missing.')
      }

      return auctionService.getAuctionById(auctionId)
    },
    enabled: Boolean(auctionId),
  })

  const bidMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!auctionId) {
        throw new Error('Auction id is missing.')
      }

      await auctionService.placeBid(auctionId, { amount })
    },
  })

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!auctionId) {
        throw new Error('Auction id is missing.')
      }

      await auctionService.addComment(auctionId, { content })
    },
  })

  const reactionMutation = useMutation({
    mutationFn: async (isLike: boolean) => {
      if (!auctionId) {
        throw new Error('Auction id is missing.')
      }

      await auctionService.setReaction(auctionId, { isLike })
    },
  })

  const isMutating =
    bidMutation.isPending || commentMutation.isPending || reactionMutation.isPending

  const syncAuctionData = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['auction-details', auctionId],
    })
    await queryClient.invalidateQueries({
      queryKey: ['auctions'],
    })
  }

  const requireAuth = () => {
    if (isAuthenticated) {
      return true
    }

    setActionMessage(null)
    setActionError('This action requires login. Please sign in first.')
    return false
  }

  const handleBidSubmit = async () => {
    if (!requireAuth()) {
      return
    }

    const parsedAmount = Number(bidAmount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setActionMessage(null)
      setActionError('Please enter a valid bid amount greater than zero.')
      return
    }

    try {
      await bidMutation.mutateAsync(parsedAmount)
      setBidAmount('')
      setActionError(null)
      setActionMessage('Bid submitted successfully.')
      await syncAuctionData()
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to submit bid.'))
    }
  }

  const handleCommentSubmit = async () => {
    if (!requireAuth()) {
      return
    }

    const content = comment.trim()

    if (!content) {
      setActionMessage(null)
      setActionError('Comment cannot be empty.')
      return
    }

    try {
      await commentMutation.mutateAsync(content)
      setComment('')
      setActionError(null)
      setActionMessage('Comment posted successfully.')
      await syncAuctionData()
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to post comment.'))
    }
  }

  const handleReaction = async (isLike: boolean) => {
    if (!requireAuth()) {
      return
    }

    try {
      await reactionMutation.mutateAsync(isLike)
      setActionError(null)
      setActionMessage(
        isLike ? 'You liked this auction.' : 'You disliked this auction.',
      )
      await syncAuctionData()
    } catch (error) {
      setActionMessage(null)
      setActionError(getApiErrorMessage(error, 'Failed to send reaction.'))
    }
  }

  if (!auctionId) {
    return (
      <section className="fin-card p-6">
        <p className="text-sm font-medium text-rose-700">Invalid auction id.</p>
      </section>
    )
  }

  if (auctionQuery.isLoading) {
    return <p className="text-sm font-medium text-slate-600">Loading auction details...</p>
  }

  if (auctionQuery.isError) {
    return (
      <section className="fin-card p-6">
        <p className="text-sm font-medium text-rose-700">
          {getApiErrorMessage(auctionQuery.error, 'Failed to load auction details.')}
        </p>
      </section>
    )
  }

  const auction = auctionQuery.data

  if (!auction) {
    return (
      <section className="fin-card p-6">
        <p className="text-sm font-medium text-slate-700">Auction details are unavailable.</p>
      </section>
    )
  }

  return (
    <section className="fin-fade-up space-y-6">
      <article className="fin-card p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Auction Details
            </p>
            <h1 className="fin-title mt-2 text-2xl font-bold sm:text-3xl">{auction.title}</h1>
            <p className="fin-subtitle mt-2 max-w-3xl text-sm">
              {auction.description ?? 'No description provided.'}
            </p>
          </div>

          <Link to="/auctions" className="fin-btn-secondary w-full sm:w-auto">
            Back to list
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              Current Price
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-blue-900">
              ${auction.currentPrice.toLocaleString()}
            </p>
          </article>

          <article className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
              Ends At
            </p>
            <p className="mt-1 text-sm font-semibold text-cyan-900">
              {new Date(auction.endTime).toLocaleString()}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Status
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
              {auction.status ?? 'Unknown'}
            </p>
          </article>
        </div>
      </article>

      <article className="fin-card p-4 sm:p-6 md:p-8">
        <h2 className="fin-title text-xl font-bold">Participate</h2>
        <p className="fin-subtitle mt-2 text-sm">
          Place a bid, add a comment, or react to this auction.
        </p>

        {!isAuthenticated ? (
          <p className="mt-3 text-sm font-medium text-amber-700">
            You need to <Link to="/login" className="underline">login</Link> to place bids,
            comments, and reactions.
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-700">Bid amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bidAmount}
              onChange={(event) => setBidAmount(event.target.value)}
              className="fin-input mt-1.5"
              placeholder="1200"
              disabled={!isAuthenticated || isMutating}
            />
            <button
              type="button"
              onClick={() => void handleBidSubmit()}
              disabled={!isAuthenticated || isMutating}
              className="fin-btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              Place Bid
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-700">Comment</label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="fin-input mt-1.5 min-h-24"
              placeholder="Share your thoughts"
              disabled={!isAuthenticated || isMutating}
            />
            <button
              type="button"
              onClick={() => void handleCommentSubmit()}
              disabled={!isAuthenticated || isMutating}
              className="fin-btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              Post Comment
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:flex">
          <button
            type="button"
            onClick={() => void handleReaction(true)}
            disabled={!isAuthenticated || isMutating}
            className="fin-btn-secondary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
          >
            Like
          </button>
          <button
            type="button"
            onClick={() => void handleReaction(false)}
            disabled={!isAuthenticated || isMutating}
            className="fin-btn-secondary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
          >
            Dislike
          </button>
        </div>

        {actionMessage ? <p className="mt-4 text-sm font-medium text-emerald-700">{actionMessage}</p> : null}
        {actionError ? <p className="mt-2 text-sm font-medium text-rose-700">{actionError}</p> : null}
      </article>

      <article className="fin-card p-4 sm:p-6 md:p-8">
        <h2 className="fin-title text-xl font-bold">Bids</h2>
        <div className="mt-3 space-y-2">
          {(auction.bids ?? []).length > 0 ? (
            (auction.bids ?? []).map((bid) => (
              <div key={bid.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">
                  ${bid.amount.toLocaleString()} by {bid.userFullName ?? 'Unknown bidder'}
                </p>
                <p className="text-xs text-slate-500">{new Date(bid.createdAt).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">No bids yet.</p>
          )}
        </div>
      </article>

      <article className="fin-card p-4 sm:p-6 md:p-8">
        <h2 className="fin-title text-xl font-bold">Comments</h2>
        <div className="mt-3 space-y-2">
          {(auction.comments ?? []).length > 0 ? (
            (auction.comments ?? []).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-sm text-slate-800">{item.content}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.userFullName ?? 'Unknown user'} -{' '}
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown time'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">No comments yet.</p>
          )}
        </div>
      </article>
    </section>
  )
}
