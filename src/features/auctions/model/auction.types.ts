export interface AuctionListItemDto {
  id: string
  title: string
  currentPrice: number
  endTime: string
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
