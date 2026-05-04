import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { applyAuthResponse, useAuthStore } from '../features/auth/model/authStore'
import type { RegisterRequestDto } from '../features/auth/model/auth.types'
import { authService } from '../services/authService'
import { getApiErrorMessage } from '../shared/lib/apiError'

// Register page allows new users to create an account and immediately store token.
export function RegisterPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const setUser = useAuthStore((state) => state.setUser)

  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterRequestDto) => authService.register(payload),
  })

  if (accessToken) {
    return <Navigate to="/auctions" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      const authResponse = await registerMutation.mutateAsync({
        fullName,
        email,
        password,
      })

      applyAuthResponse(authResponse)

      // We call /me after registration to sync canonical user data from backend.
      const me = await authService.me().catch(() => authResponse.user)
      setUser(me)

      navigate('/auctions')
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Registration failed. Please verify your inputs and try again.',
        ),
      )
    }
  }

  return (
    <section className="fin-auth-shell fin-fade-up">
      <div className="fin-auth-card">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">Onboarding</p>
        <h1 className="fin-title mt-2 text-2xl font-bold sm:text-3xl">Create Account</h1>
        <p className="fin-subtitle mt-2 text-sm">
          Set up your profile and start trading in active auctions.
        </p>

        <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-xs font-semibold text-cyan-900">
          Enterprise-grade onboarding for secure account creation.
        </div>

        <p className="mt-2 text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">
            Sign in
          </Link>
        </p>

        <form className="fin-auth-form" onSubmit={handleSubmit}>
          <label className="fin-field">
            <span className="fin-field-label">Display Name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="fin-input"
              placeholder="John Trader"
              autoComplete="name"
              required
            />
          </label>

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
              placeholder="Create a secure password"
              autoComplete="new-password"
              required
            />
            <span className="fin-form-note">
              Use at least 8 characters with uppercase, lowercase, and numbers.
            </span>
          </label>

          {error ? <p className="fin-form-error">{error}</p> : null}

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="fin-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-65"
          >
            {registerMutation.isPending ? 'Creating account...' : 'Create account'}
          </button>

          <p className="fin-form-note text-center">
            You can update profile details later from your account settings.
          </p>
        </form>
      </div>
    </section>
  )
}
