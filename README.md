# Auction Platform Frontend

Production-like frontend for Auction Platform API.

Stack:
- React + TypeScript + Vite
- axios
- react-router-dom
- @tanstack/react-query
- zustand (auth state)
- Tailwind CSS

## Run Locally

1. Install dependencies
```bash
npm i
```

2. Configure environment

Create or update [.env](.env):
```env
VITE_API_URL=https://localhost:7146
```

3. Start dev server
```bash
npm run dev
```

Frontend origin is expected to be:
- http://localhost:5173

Backend base URL is expected to be:
- https://localhost:7146

## Architecture

```text
src/
  api/
    apiClient.ts
  services/
    authService.ts
    auctionService.ts
    adminService.ts
  features/
    auth/
      model/
        auth.types.ts
        authStore.ts
      hooks/
        useAuthBootstrap.ts
    auctions/
      model/
        auction.types.ts
    admin/
      model/
        admin.types.ts
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    AuctionsPage.tsx
    AuctionDetailsPage.tsx
    AccountPage.tsx
    admin/
      AdminUsersPage.tsx
      AdminCommentsPage.tsx
      AdminAuctionsPage.tsx
  shared/
    config/
      env.ts
    lib/
      apiError.ts
      authRole.ts
    router/
      ProtectedRoute.tsx
      AdminRoute.tsx
    ui/
      AppNavbar.tsx
```

## Implemented Flow

1. Login page calls POST /api/auth/login.
2. Tokens and user are stored in Zustand store.
3. Immediately after login, frontend calls GET /api/auth/me.
4. Auctions list page loads data from GET /api/auctions.
5. Auction details page allows:
   - POST /api/auctions/{id}/bids
   - POST /api/auctions/{id}/comments
   - POST /api/auctions/{id}/reactions
6. Logout button calls POST /api/auth/logout and clears auth store.

## Auth and Security Notes

- Access token is attached by axios request interceptor.
- On 401, axios response interceptor attempts one refresh via POST /api/auth/refresh.
- On successful refresh, store is updated and original request is retried once.
- If refresh fails, user is logged out and redirected to /login.
- Admin routes are protected by role check user.role === Admin (or roles contains Admin).

## Routing

Public routes:
- /login
- /register
- /auctions
- /auctions/:id

Protected routes:
- /account

Admin routes:
- /admin/users
- /admin/comments
- /admin/auctions

## Build Check

```bash
npm run build
```
