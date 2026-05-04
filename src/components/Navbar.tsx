import { Link, NavLink } from 'react-router-dom'

interface NavbarProps {
  isAuthenticated: boolean
  onLogout: () => void
}

// Global top navigation used across pages for quick route changes and auth actions.
export function Navbar({ isAuthenticated, onLogout }: NavbarProps) {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      'rounded-xl px-4 py-2 text-sm font-semibold transition',
      isActive
        ? 'bg-blue-600 text-white shadow-[0_12px_18px_-14px_rgba(15,93,227,0.9)]'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    ].join(' ')

  return (
    <header className="fin-header-glass sticky top-0 z-20">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <Link to="/auctions" className="group inline-flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200">
            AH
          </span>
          <span>
            <span className="fin-title block text-lg font-bold leading-none">AuctionHub</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Capital Markets
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <NavLink to="/auctions" className={navClass}>
            Auctions
          </NavLink>
          <NavLink to="/register" className={navClass}>
            Register
          </NavLink>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onLogout}
              className="fin-btn-secondary"
            >
              Logout
            </button>
          ) : (
            <NavLink to="/login" className={navClass}>
              Login
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  )
}
