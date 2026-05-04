export type UserRole = 'User' | 'Admin' | string

export interface UserDto {
  id: string
  email: string
  fullName: string
  role?: UserRole
  roles?: UserRole[]
  status?: string
}

export interface RegisterRequestDto {
  email: string
  password: string
  fullName: string
}

export interface LoginRequestDto {
  email: string
  password: string
}

export interface RefreshRequestDto {
  refreshToken: string
}

export interface AuthResponseDto {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
  user: UserDto
}
