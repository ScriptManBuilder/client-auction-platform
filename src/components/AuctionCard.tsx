import type { Auction } from '../types/auction'

interface AuctionCardProps {
  auction: Auction
}

// Small presentational component that displays one auction in a reusable card layout.
export function AuctionCard({ auction }: AuctionCardProps) {
  const endDate = new Date(auction.endTime)

  return (
    <article className="fin-card group p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          Active
        </span>
        <span className="text-xs font-medium text-slate-500">ID: {auction.id.slice(0, 8)}</span>
      </div>

      <h3 className="fin-title text-lg font-semibold leading-tight text-slate-900">{auction.title}</h3>

      <p className="mt-3 text-sm text-slate-500">Current Price</p>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900">
        <span className="mr-1 text-base font-bold text-slate-500">$</span>
        {auction.currentPrice.toLocaleString()}
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">End Time</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{endDate.toLocaleString()}</p>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Current Price:{' '}
        <span className="font-semibold text-slate-700">
          ${auction.currentPrice.toLocaleString()}
        </span>
      </p>
    </article>
  )
}
