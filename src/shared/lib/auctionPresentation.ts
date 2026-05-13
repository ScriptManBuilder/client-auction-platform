const auctionStatusMap: Record<string, string> = {
  '0': 'Draft',
  '1': 'Active',
  '2': 'Finished',
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatAuctionStatus(status: unknown) {
  if (typeof status === 'string') {
    const trimmedStatus = status.trim()

    if (!trimmedStatus) {
      return 'Unknown'
    }

    return auctionStatusMap[trimmedStatus] ?? `${trimmedStatus.charAt(0).toUpperCase()}${trimmedStatus.slice(1).toLowerCase()}`
  }

  if (typeof status === 'number') {
    return auctionStatusMap[String(status)] ?? 'Unknown'
  }

  return 'Unknown'
}

export function getAuctionStatusTone(status: unknown) {
  const normalizedStatus = formatAuctionStatus(status).toLowerCase()

  if (normalizedStatus === 'active') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (normalizedStatus === 'draft') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (normalizedStatus === 'finished') {
    return 'border-slate-200 bg-slate-100 text-slate-700'
  }

  return 'border-blue-200 bg-blue-50 text-blue-700'
}

export function formatAuctionCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatAuctionDate(value?: string) {
  if (!value) {
    return 'Not scheduled'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not scheduled'
  }

  return parsedDate.toLocaleString()
}

export function formatAuctionShortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id
}

export function formatAuctionHeadlineDate(value?: string) {
  if (!value) {
    return 'Market timing unavailable'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Market timing unavailable'
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}