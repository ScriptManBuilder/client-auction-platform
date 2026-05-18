import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auctionService } from '../services/auctionService'
import {
  formatAuctionCurrency,
  formatAuctionDate,
  formatAuctionHeadlineDate,
  formatAuctionShortId,
  formatAuctionStatus,
  getAuctionStatusTone,
} from '../shared/lib/auctionPresentation'
import { getApiErrorMessage } from '../shared/lib/apiError'

interface AuctionPreviewImageProps {
  title: string
  mainImageUrl?: string
}

function AuctionPreviewImage({ title, mainImageUrl }: AuctionPreviewImageProps) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false)

  useEffect(() => {
    setImageLoadFailed(false)
  }, [mainImageUrl])

  const canRenderImage = Boolean(mainImageUrl?.trim()) && !imageLoadFailed

  return (
    <div className="relative mt-4 h-44 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100">
      {canRenderImage ? (
        <img
          src={mainImageUrl}
          alt={`Photo of ${title}`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageLoadFailed(true)}
        />
      ) : (
        <div className="grid h-full place-items-center bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-50 px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Photo unavailable
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/20 to-transparent" />
    </div>
  )
}

// Public page that lists all auctions from GET /api/auctions.
export function AuctionsPage() {
  const auctionsQuery = useQuery({
    queryKey: ['auctions'],
    queryFn: auctionService.getAuctions,
  })

  const auctions = auctionsQuery.data ?? []
  const activeAuctions = auctions.filter((auction) => formatAuctionStatus(auction.status) === 'Active')
  const totalMarketValue = auctions.reduce((accumulator, auction) => accumulator + auction.currentPrice, 0)
  const nextClose = auctions
    .map((auction) => auction.endTime)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0]

  return (
    <section className="fin-fade-up space-y-6">
      <div className="fin-market-hero">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Marketplace overview
            </p>
            <h1 className="fin-title mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl md:text-[3.2rem]">
              Premium vehicle auctions with real-time market positioning.
            </h1>
            <p className="fin-subtitle mt-4 max-w-2xl text-sm leading-6 md:text-base">
              Review live lots, compare pricing signals, and step into each auction with cleaner execution controls and stronger market context.
            </p>
          </div>

          <div className="fin-market-brief">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Market brief
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
                <span className="text-sm text-slate-500">Market status</span>
                <span className="text-sm font-semibold text-slate-900">
                  {auctionsQuery.isLoading ? 'Syncing desk' : 'Live order flow'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
                <span className="text-sm text-slate-500">Next close</span>
                <span className="text-sm font-semibold text-slate-900">
                  {formatAuctionHeadlineDate(nextClose)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void auctionsQuery.refetch()}
                className="fin-btn-primary mt-1 w-full"
              >
                {auctionsQuery.isFetching ? 'Refreshing...' : 'Refresh Market Data'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="fin-market-stat fin-market-stat-blue">
            <p className="fin-market-stat-label">
              Live lots
            </p>
            <p className="fin-market-stat-value">{activeAuctions.length}</p>
            <p className="fin-market-stat-copy">Auctions currently open for activity</p>
          </article>

          <article className="fin-market-stat fin-market-stat-cyan">
            <p className="fin-market-stat-label">
              Visible market value
            </p>
            <p className="fin-market-stat-value">{formatAuctionCurrency(totalMarketValue)}</p>
            <p className="fin-market-stat-copy">Aggregate current pricing across listed lots</p>
          </article>

          <article className="fin-market-stat fin-market-stat-slate">
            <p className="fin-market-stat-label">
              Coverage
            </p>
            <p className="fin-market-stat-value">Global</p>
            <p className="fin-market-stat-copy">Cross-border sourcing and premium lot visibility</p>
          </article>
        </div>
      </div>

      {auctionsQuery.isLoading ? (
        <p className="text-sm font-medium text-slate-600">Loading auctions...</p>
      ) : null}

      {auctionsQuery.isError ? (
        <p className="text-sm font-medium text-rose-700">
          {getApiErrorMessage(auctionsQuery.error, 'Could not load auctions.')}
        </p>
      ) : null}

      {!auctionsQuery.isLoading && !auctionsQuery.isError ? (
        <div className="fin-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.length > 0 ? (
            auctions.map((auction) => (
              <Link
                key={auction.id}
                to={`/auctions/${auction.id}`}
                className="fin-auction-card group block"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={[
                    'inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                    getAuctionStatusTone(auction.status),
                  ].join(' ')}>
                    {formatAuctionStatus(auction.status)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">#{formatAuctionShortId(auction.id)}</span>
                </div>

                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Lot preview
                    </p>
                    <h2 className="fin-title mt-2 text-xl font-semibold leading-tight text-slate-900">
                      {auction.title}
                    </h2>
                  </div>

                  <div className="fin-auction-card-orb" />
                </div>

                <AuctionPreviewImage
                  title={auction.title}
                  mainImageUrl={auction.mainImageUrl}
                />

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {auction.description?.trim() || 'A curated premium lot with active bidding access and live market participation.'}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Current price
                    </p>
                    <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                      {formatAuctionCurrency(auction.currentPrice)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Closing window
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">
                      {formatAuctionHeadlineDate(auction.endTime)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Ends at
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{formatAuctionDate(auction.endTime)}</p>
                  </div>

                  <span className="text-sm font-semibold text-blue-700 transition group-hover:text-blue-800">
                    Open lot
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <article className="fin-card p-6">
              <p className="text-sm text-slate-600">No auctions available yet.</p>
            </article>
          )}
        </div>
      ) : null}
    </section>
  )
}
