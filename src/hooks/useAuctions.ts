import { useCallback, useEffect, useState } from 'react'
import { auctionService } from '../services/auctionService'
import type { Auction } from '../types/auction'

// This hook handles fetching auctions and exposes loading/error state to the page.
export function useAuctions() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAuctions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await auctionService.getAuctions()
      setAuctions(data)
    } catch {
      setError('Could not load auctions. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAuctions()
  }, [loadAuctions])

  return {
    auctions,
    isLoading,
    error,
    reload: loadAuctions,
  }
}
