import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { applyAuthResponse, useAuthStore } from '../features/auth/model/authStore'
import type { LoginRequestDto } from '../features/auth/model/auth.types'
import { authService } from '../services/authService'
import { getApiErrorMessage } from '../shared/lib/apiError'

interface LocationState {
  from?: string
}

// Login page handles sign-in and immediately loads /api/auth/me after successful auth.
export function LoginPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const setUser = useAuthStore((state) => state.setUser)

  const navigate = useNavigate()
  const location = useLocation()

  const from = ((location.state as LocationState | null)?.from ?? '/auctions') as string

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: (payload: LoginRequestDto) => authService.login(payload),
  })

  if (accessToken) {
    return <Navigate to="/auctions" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      const authResponse = await loginMutation.mutateAsync({
        email,
        password,
      })

      applyAuthResponse(authResponse)

      // We call /me after login to guarantee up-to-date user profile and role.
      const me = await authService.me().catch(() => authResponse.user)
      setUser(me)

      navigate(from, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Login failed. Check your credentials and try again.'))
    }
  }

  return (
    <section className="fin-auth-shell fin-fade-up">
      <div className="fin-auth-card">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Client Access</p>
        <h1 className="fin-title mt-2 text-2xl font-bold sm:text-3xl">Sign In</h1>
        <p className="fin-subtitle mt-2 text-sm">
          Enter your credentials to access your auction workspace.
        </p>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-semibold text-blue-800">
          Bank-grade secure session. Token refresh is handled automatically.
        </div>

        <p className="mt-2 text-sm text-slate-600">
          New here?{' '}
          <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-800">
            Create an account
          </Link>
        </p>

        <form className="fin-auth-form" onSubmit={handleSubmit}>
          <label className="fin-field">
            <span className="fin-field-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="fin-input"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="fin-field">
            <span className="fin-field-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="fin-input"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <span className="fin-form-note">Use your secure account password.</span>
          </label>

          {error ? <p className="fin-form-error">{error}</p> : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="fin-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="fin-form-note text-center">
            By continuing, you agree to secure session monitoring.
          </p>
        </form>
      </div>
    </section>
  )
}
