import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { auctionService } from '../services/auctionService'
import { getApiErrorMessage } from '../shared/lib/apiError'

// Public page that lists all auctions from GET /api/auctions.
export function AuctionsPage() {
  const auctionsQuery = useQuery({
    queryKey: ['auctions'],
    queryFn: auctionService.getAuctions,
  })

  const auctions = auctionsQuery.data ?? []

  return (
    <section className="fin-fade-up space-y-6">
      <div className="fin-card p-4 sm:p-5 md:p-7">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Trading Desk
            </p>
            <h1 className="fin-title mt-2 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
              Live Auctions
            </h1>
            <p className="fin-subtitle mt-2 max-w-xl text-sm md:text-base">
              Browse active lots and open the detail page to place bids and comments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void auctionsQuery.refetch()}
            className="fin-btn-primary w-full sm:w-auto"
          >
            {auctionsQuery.isFetching ? 'Refreshing...' : 'Refresh Market Data'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              Open Lots
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-blue-900">{auctions.length}</p>
          </article>

          <article className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
              Status
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-cyan-900">
              {auctionsQuery.isLoading ? 'Syncing' : 'Live'}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Coverage
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Global</p>
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
                className="fin-card group block p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Active
                  </span>
                  <span className="text-xs font-medium text-slate-500">#{auction.id.slice(0, 6)}</span>
                </div>

                <h2 className="fin-title text-lg font-semibold leading-tight text-slate-900">
                  {auction.title}
                </h2>

                <p className="mt-2 text-sm text-slate-500">Current price</p>
                <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                  ${auction.currentPrice.toLocaleString()}
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  Ends at {new Date(auction.endTime).toLocaleString()}
                </p>
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
