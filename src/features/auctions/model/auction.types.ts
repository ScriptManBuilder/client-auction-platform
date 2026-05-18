export interface AuctionListItemDto {
  id: string
  title: string
  currentPrice: number
  endTime: string
  mainImageUrl?: string
  description?: string
  status?: string
}

export interface AuctionBidDto {
  id: string
  amount: number
  createdAt: string
  userFullName?: string
}

export interface AuctionCommentDto {
  id: string
  content: string
  createdAt: string
  status?: string
  userFullName?: string
  userEmail?: string
  userName?: string
  userNickname?: string
  userNickName?: string
}

export interface AuctionReactionsDto {
  likes: number
  dislikes: number
}

export interface AuctionDetailsDto extends AuctionListItemDto {
  startPrice?: number
  bidsCount?: number
  likesCount?: number
  dislikesCount?: number
  highestBidderId?: string
  createdAt?: string
  updatedAt?: string
  bids?: AuctionBidDto[]
  comments?: AuctionCommentDto[]
  reactions?: AuctionReactionsDto
}

export interface CreateBidRequestDto {
  amount: number
}

export interface CreateCommentRequestDto {
  content: string
}

export interface CreateReactionRequestDto {
  isLike: boolean
}
