import { useAuthStore } from '../features/auth/model/authStore'

// Basic protected page that shows current auth session information.
export function AccountPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <section className="fin-fade-up fin-card p-6 md:p-8">
      <h1 className="fin-title text-2xl font-bold">My Account</h1>
      <p className="fin-subtitle mt-2 text-sm">This page is visible only for authenticated users.</p>

      <div className="mt-5 space-y-2 text-sm text-slate-700">
        <p>
          <span className="font-semibold">Full Name:</span> {user?.fullName ?? 'Unknown'}
        </p>
        <p>
          <span className="font-semibold">Email:</span> {user?.email ?? 'Unknown'}
        </p>
        <p>
          <span className="font-semibold">Role:</span> {user?.role ?? 'User'}
        </p>
      </div>
    </section>
  )
}
