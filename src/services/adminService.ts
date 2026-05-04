import { apiClient } from '../api/apiClient'
import type {
  AdminAuctionDto,
  AdminAuctionStatus,
  AdminCommentDto,
  AdminCommentStatus,
  AdminUserDto,
  AdminUserStatus,
} from '../features/admin/model/admin.types'

// Admin service wraps moderation and management endpoints.
export const adminService = {
  async getUsers(status: AdminUserStatus) {
    const { data } = await apiClient.get<AdminUserDto[]>('/api/admin/users', {
      params: { status },
    })

    return data
  },

  async approveUser(userId: string) {
    await apiClient.patch(`/api/admin/users/${userId}/approve`)
  },

  async banUser(userId: string) {
    await apiClient.patch(`/api/admin/users/${userId}/ban`)
  },

  async promoteUserToAdmin(userId: string) {
    await apiClient.patch(`/api/admin/users/${userId}/promote-admin`)
  },

  async getComments(status: AdminCommentStatus) {
    const { data } = await apiClient.get<AdminCommentDto[]>('/api/admin/comments', {
      params: { status },
    })

    return data
  },

  async approveComment(commentId: string) {
    await apiClient.patch(`/api/admin/comments/${commentId}/approve`)
  },

  async rejectComment(commentId: string) {
    await apiClient.patch(`/api/admin/comments/${commentId}/reject`)
  },

  async getAuctions(status: AdminAuctionStatus) {
    const { data } = await apiClient.get<AdminAuctionDto[]>('/api/admin/auctions', {
      params: { status },
    })

    return data
  },

  async createAuction(payload: Record<string, unknown>) {
    const { data } = await apiClient.post<AdminAuctionDto>('/api/admin/auctions', payload)
    return data
  },

  async updateAuction(auctionId: string, payload: Record<string, unknown>) {
    const { data } = await apiClient.put<AdminAuctionDto>(`/api/admin/auctions/${auctionId}`, payload)
    return data
  },

  async activateAuction(auctionId: string) {
    await apiClient.patch(`/api/admin/auctions/${auctionId}/activate`)
  },

  async finishAuction(auctionId: string) {
    await apiClient.patch(`/api/admin/auctions/${auctionId}/finish`)
  },
}
