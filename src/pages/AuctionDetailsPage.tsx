import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../features/auth/model/authStore'
import { auctionService } from '../services/auctionService'
import { getApiErrorMessage } from '../shared/lib/apiError'
import {
  formatAuctionCurrency,
  formatAuctionDate,
  formatAuctionShortId,
  formatAuctionStatus,
  getAuctionStatusTone,
} from '../shared/lib/auctionPresentation'

const avatarPalette = [
  { bg: '#DBEAFE', fg: '#1E3A8A' },
  { bg: '#DCFCE7', fg: '#166534' },
  { bg: '#FFE4E6', fg: '#9F1239' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#E0E7FF', fg: '#3730A3' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#CCFBF1', fg: '#115E59' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
]

const COMMENTS_PAGE_SIZE = 3
const COMMENT_MAX_LENGTH = 200

const normalize = (value?: string) => value?.trim() ?? ''

const extractInitial = (value: string) => {
  const sanitized = value.replace(/[^a-zA-Zа-яА-Я0-9]/g, '')
  return sanitized.charAt(0).toUpperCase()
}

const buildCommentAvatar = (params: {
  fullName?: string
  userName?: string
  userNickname?: string
  userNickName?: string
  userEmail?: string
}) => {
  const name =
    normalize(params.fullName) ||
    normalize(params.userNickname) ||
    normalize(params.userNickName) ||
    normalize(params.userName)

  const email = normalize(params.userEmail)
  const emailLocal = email.includes('@') ? email.split('@')[0] : email

  const first = extractInitial(name)
  const second = extractInitial(emailLocal)
  const fallback = extractInitial(name.slice(1)) || 'U'
  const initials = `${first || 'U'}${second || fallback}`

  const seed = `${name}|${email}`
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const color = avatarPalette[Math.abs(hash) % avatarPalette.length]

  return {
    initials,
    backgroundColor: color.bg,
    textColor: color.fg,
    displayName: name || 'Unknown user',
  }
}

// Shows one auction and allows authenticated users to bid, comment, and react.
export function AuctionDetailsPage() {
  const { id: auctionId } = useParams()
  const queryClient = useQueryClient()
  const isAuthenticated = Boolean(useAuthStore((state) => state.accessToken))

  const [bidAmount, setBidAmount] = useState('')
  const [comment, setComment] = useState('')
  const [commentPage, setCommentPage] = useState(1)
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

    if (content.length > COMMENT_MAX_LENGTH) {
      setActionMessage(null)
      setActionError(`Comment must be ${COMMENT_MAX_LENGTH} characters or less.`)
      return
    }

    try {
      await commentMutation.mutateAsync(content)
      setComment('')
      setCommentPage(1)
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

  const comments = auctionQuery.data?.comments ?? []
  const totalCommentPages = Math.max(1, Math.ceil(comments.length / COMMENTS_PAGE_SIZE))
  const activeCommentPage = Math.min(commentPage, totalCommentPages)
  const commentsStartIndex = (activeCommentPage - 1) * COMMENTS_PAGE_SIZE
  const visibleComments = comments.slice(
    commentsStartIndex,
    commentsStartIndex + COMMENTS_PAGE_SIZE,
  )
  const commentLength = comment.length
  const isCommentTooLong = comment.trim().length > COMMENT_MAX_LENGTH

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

  const bidHistory = auction.bids ?? []
  const bidCount = auction.bidsCount ?? bidHistory.length
  const hasDetailedBidHistory = bidHistory.length > 0
  const hasBidActivity = bidCount > 0
  const likesCount = auction.likesCount ?? auction.reactions?.likes ?? 0
  const dislikesCount = auction.dislikesCount ?? auction.reactions?.dislikes ?? 0
  const minimumBid = Math.max(auction.currentPrice + 1, auction.startPrice ?? 0)

  return (
    <section className="fin-fade-up space-y-6">
      <article className="fin-auction-hero-card">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.8fr)] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={[
                'inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                getAuctionStatusTone(auction.status),
              ].join(' ')}>
                {formatAuctionStatus(auction.status)}
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Lot {formatAuctionShortId(auction.id)}
              </span>
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Auction details
            </p>
            <h1 className="fin-title mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              {auction.title}
            </h1>
            <p className="fin-subtitle mt-4 max-w-3xl text-sm leading-6 sm:text-base">
              {auction.description ?? 'No description provided.'}
            </p>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <article className="fin-market-stat fin-market-stat-blue">
                <p className="fin-market-stat-label">Current price</p>
                <p className="fin-market-stat-value">{formatAuctionCurrency(auction.currentPrice)}</p>
                <p className="fin-market-stat-copy">Live market position for this lot</p>
              </article>

              <article className="fin-market-stat fin-market-stat-cyan">
                <p className="fin-market-stat-label">Ends at</p>
                <p className="text-lg font-bold tracking-tight text-slate-950">
                  {formatAuctionDate(auction.endTime)}
                </p>
                <p className="fin-market-stat-copy">Scheduled close of the bidding window</p>
              </article>

              <article className="fin-market-stat fin-market-stat-slate">
                <p className="fin-market-stat-label">Activity</p>
                <p className="fin-market-stat-value">{bidCount + comments.length}</p>
                <p className="fin-market-stat-copy">Combined bids and comment signals</p>
              </article>
            </div>
          </div>

          <aside className="fin-detail-aside">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Execution panel
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <span className="text-sm text-slate-500">Listing status</span>
                <span className="text-sm font-semibold text-slate-900">{formatAuctionStatus(auction.status)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <span className="text-sm text-slate-500">Bids registered</span>
                <span className="text-sm font-semibold text-slate-900">{bidCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <span className="text-sm text-slate-500">Comments posted</span>
                <span className="text-sm font-semibold text-slate-900">{(auction.comments ?? []).length}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <span className="text-sm text-slate-500">Reaction balance</span>
                <span className="text-sm font-semibold text-slate-900">{likesCount} / {dislikesCount}</span>
              </div>
            </div>

            <Link to="/auctions" className="fin-btn-secondary mt-6 w-full">
              Back to list
            </Link>
          </aside>
        </div>
      </article>

      <article className="fin-card p-5 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Participate
            </p>
            <h2 className="fin-title mt-2 text-2xl font-bold">Execution actions</h2>
            <p className="fin-subtitle mt-2 text-sm leading-6">
              Submit pricing intent, publish a market comment, or register a quick reaction.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Authenticated users can bid, comment, and react in real time.
          </div>
        </div>

        {!isAuthenticated ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-800">
            You need to <Link to="/login" className="underline">login</Link> to place bids,
            comments, and reactions.
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="fin-action-card">
            <div className="fin-action-card-header">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bid desk</p>
              <h3 className="fin-title mt-2 text-xl font-bold">Place a bid</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Enter your intended amount and post it directly to the active auction book.
              </p>
            </div>

            <div className="fin-action-card-body">
              <label className="block text-sm font-semibold text-slate-700">Bid amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bidAmount}
                onChange={(event) => setBidAmount(event.target.value)}
                className="fin-input fin-input-quiet mt-2"
                placeholder="1200"
                disabled={!isAuthenticated || isMutating}
              />

              <div className="fin-action-card-note mt-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Current market level
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatAuctionCurrency(auction.currentPrice)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Suggested next bid
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatAuctionCurrency(minimumBid)}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleBidSubmit()}
              disabled={!isAuthenticated || isMutating}
              className="fin-btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              Place Bid
            </button>
          </div>

          <div className="fin-action-card">
            <div className="fin-action-card-header">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Market note</p>
              <h3 className="fin-title mt-2 text-xl font-bold">Post a comment</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Add structured context or quick market sentiment to the lot conversation.
              </p>
            </div>

            <div className="fin-action-card-body">
              <label className="block text-sm font-semibold text-slate-700">Comment</label>
              <textarea
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value)

                  if (actionError === `Comment must be ${COMMENT_MAX_LENGTH} characters or less.`) {
                    setActionError(null)
                  }
                }}
                className="fin-input fin-input-quiet mt-2 min-h-32 resize-none"
                placeholder="Share your thoughts"
                disabled={!isAuthenticated || isMutating}
                maxLength={COMMENT_MAX_LENGTH}
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Up to {COMMENT_MAX_LENGTH} characters. Keep comments concise and relevant.
                </p>
                <span
                  className={[
                    'text-xs font-semibold tabular-nums',
                    isCommentTooLong ? 'text-rose-700' : 'text-slate-500',
                  ].join(' ')}
                >
                  {commentLength}/{COMMENT_MAX_LENGTH}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCommentSubmit()}
              disabled={!isAuthenticated || isMutating || isCommentTooLong}
              className="fin-btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              Post Comment
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleReaction(true)}
            disabled={!isAuthenticated || isMutating}
            className="fin-btn-secondary min-w-[10rem] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Like · {likesCount}
          </button>
          <button
            type="button"
            onClick={() => void handleReaction(false)}
            disabled={!isAuthenticated || isMutating}
            className="fin-btn-secondary min-w-[10rem] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Dislike · {dislikesCount}
          </button>
        </div>

        {actionMessage ? <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-800">{actionMessage}</p> : null}
        {actionError ? <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-800">{actionError}</p> : null}
      </article>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="fin-card p-5 sm:p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bid history</p>
              <h2 className="fin-title mt-2 text-2xl font-bold">Bids</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {bidCount}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {hasDetailedBidHistory ? (
              bidHistory.map((bid) => (
                <div key={bid.id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50/75 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Registered bid
                      </p>
                      <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                        {formatAuctionCurrency(bid.amount)}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        by {bid.userFullName ?? 'Unknown bidder'}
                      </p>
                    </div>
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                      Bid
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">{formatAuctionDate(bid.createdAt)}</p>
                </div>
              ))
            ) : hasBidActivity ? (
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/75 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Registered bid activity
                    </p>
                    <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                      {formatAuctionCurrency(auction.currentPrice)}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {bidCount} bid{bidCount === 1 ? '' : 's'} recorded for this lot
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Highest bidder id: {auction.highestBidderId ? formatAuctionShortId(auction.highestBidderId) : 'Not available'}
                    </p>
                  </div>
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                    Summary
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Opening price
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {typeof auction.startPrice === 'number' ? formatAuctionCurrency(auction.startPrice) : 'Not available'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Latest market level
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatAuctionCurrency(auction.currentPrice)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  The current auction details endpoint exposes bid totals and top-level summary fields, but not the full bid-by-bid history list.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No bids yet.</p>
            )}
          </div>
        </article>

        <article className="fin-card p-5 sm:p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Conversation flow</p>
              <h2 className="fin-title mt-2 text-2xl font-bold">Comments</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {(auction.comments ?? []).length}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {comments.length > 0 ? (
              visibleComments.map((item) => {
              const avatar = buildCommentAvatar({
                fullName: item.userFullName,
                userName: item.userName,
                userNickname: item.userNickname,
                userNickName: item.userNickName,
                userEmail: item.userEmail,
              })

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-[1.35rem] border border-slate-200 bg-slate-50/75 p-4"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase"
                    style={{ backgroundColor: avatar.backgroundColor, color: avatar.textColor }}
                    aria-label={`Comment author avatar for ${avatar.displayName}`}
                    title={avatar.displayName}
                  >
                    {avatar.initials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{avatar.displayName}</p>
                      <span className="text-xs text-slate-400">•</span>
                      <p className="text-xs text-slate-500">
                        {item.createdAt ? formatAuctionDate(item.createdAt) : 'Unknown time'}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {item.content}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-slate-600">No comments yet.</p>
          )}

            {comments.length > COMMENTS_PAGE_SIZE ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
                <p className="text-sm text-slate-500">
                  Showing {commentsStartIndex + 1}-{Math.min(commentsStartIndex + COMMENTS_PAGE_SIZE, comments.length)} of {comments.length} comments
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCommentPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={activeCommentPage === 1}
                    className="fin-btn-secondary min-w-[7rem] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Page {activeCommentPage} / {totalCommentPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCommentPage((currentPage) => Math.min(totalCommentPages, currentPage + 1))}
                    disabled={activeCommentPage === totalCommentPages}
                    className="fin-btn-secondary min-w-[7rem] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  )
}
