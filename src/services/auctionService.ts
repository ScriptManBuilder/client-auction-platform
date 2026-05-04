import { apiClient } from '../api/apiClient'
import type {
  AuctionDetailsDto,
  AuctionListItemDto,
  CreateBidRequestDto,
  CreateCommentRequestDto,
  CreateReactionRequestDto,
} from '../features/auctions/model/auction.types'

// Auction service provides all public and authenticated auction operations.
export const auctionService = {
  async getAuctions() {
    const { data } = await apiClient.get<AuctionListItemDto[]>('/api/auctions')
    return data
  },

  async getAuctionById(auctionId: string) {
    const { data } = await apiClient.get<AuctionDetailsDto>(`/api/auctions/${auctionId}`)
    return data
  },

  async placeBid(auctionId: string, payload: CreateBidRequestDto) {
    await apiClient.post(`/api/auctions/${auctionId}/bids`, payload)
  },

  async addComment(auctionId: string, payload: CreateCommentRequestDto) {
    await apiClient.post(`/api/auctions/${auctionId}/comments`, payload)
  },

  async setReaction(auctionId: string, payload: CreateReactionRequestDto) {
    await apiClient.post(`/api/auctions/${auctionId}/reactions`, payload)
  },
}
