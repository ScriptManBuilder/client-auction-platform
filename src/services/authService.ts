import { apiClient } from '../api/apiClient'
import type {
  AuthResponseDto,
  LoginRequestDto,
  RefreshRequestDto,
  RegisterRequestDto,
  UserDto,
} from '../features/auth/model/auth.types'

// Auth service contains all identity endpoints used by the frontend.
export const authService = {
  async register(payload: RegisterRequestDto) {
    const { data } = await apiClient.post<AuthResponseDto>('/api/auth/register', payload)
    return data
  },

  async login(payload: LoginRequestDto) {
    const { data } = await apiClient.post<AuthResponseDto>('/api/auth/login', payload)
    return data
  },

  async refresh(payload: RefreshRequestDto) {
    const { data } = await apiClient.post<AuthResponseDto>('/api/auth/refresh', payload)
    return data
  },

  async logout(payload?: RefreshRequestDto) {
    await apiClient.post('/api/auth/logout', payload ?? {})
  },

  async me() {
    const { data } = await apiClient.get<UserDto>('/api/auth/me')
    return data
  },
}
