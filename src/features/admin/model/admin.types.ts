export type AdminUserStatus = 'Pending' | 'Approved' | 'Banned'
export type AdminCommentStatus = 'Pending' | 'Approved' | 'Rejected'
export type AdminAuctionStatus = 'Draft' | 'Active' | 'Finished'

export interface AdminUserDto {
  id: string
  email: string
  fullName: string
  status: AdminUserStatus | string
  role?: string
}

export interface AdminCommentDto {
  id: string
  content: string
  status: AdminCommentStatus | string
  auctionId?: string
  userFullName?: string
  createdAt?: string
}

export interface AdminAuctionDto {
  id: string
  title: string
  status: AdminAuctionStatus | string
  currentPrice?: number
  endTime?: string
}
