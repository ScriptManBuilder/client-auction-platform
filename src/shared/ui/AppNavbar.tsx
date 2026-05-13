import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

interface AppNavbarProps {
  isAuthenticated: boolean
  isAdmin: boolean
  userName?: string
  isLoggingOut: boolean
  onLogout: () => void
}

// Main navigation keeps page links and session controls in one consistent place.
export function AppNavbar({
  isAuthenticated,
  isAdmin,
  userName,
  isLoggingOut,
  onLogout,
}: AppNavbarProps) {
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isAdminSection = location.pathname.startsWith('/admin')

  useEffect(() => {
    // Close the drawer after route changes so navigation feels immediate on mobile.
    setIsMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'rounded-2xl px-4 py-2.5 text-sm font-semibold transition',
      isActive
        ? 'bg-[linear-gradient(135deg,#0f5de3,#0a4ac0)] text-white shadow-[0_18px_30px_-22px_rgba(15,93,227,1)]'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ].join(' ')

  const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'block rounded-xl px-4 py-3 text-sm font-semibold transition',
      isActive
        ? 'bg-[linear-gradient(135deg,#0f5de3,#0a4ac0)] text-white'
        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    ].join(' ')

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const handleLogout = () => {
    onLogout()
    closeMenu()
  }

  return (
    <>
      <header className="fin-header-glass sticky top-0 z-40">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-2.5 py-3 sm:px-4 sm:py-4 md:px-6">
          <Link to="/auctions" className="group inline-flex items-center gap-3" onClick={closeMenu}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#0f5de3,#12c3d7)] text-xs font-bold text-white shadow-[0_18px_28px_-18px_rgba(15,93,227,1)] sm:h-11 sm:w-11 sm:text-sm">
              AH
            </span>
            <span className="min-w-0 max-w-[9rem] sm:max-w-none">
              <span className="fin-title block truncate text-[1.02rem] font-bold leading-none sm:text-lg">
                AuctionHub
              </span>
              <span className="fin-brand-subtitle block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">
                Enterprise Market Desk
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-1.5 rounded-[1.5rem] border border-slate-200/80 bg-white/86 p-1.5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.95)]">
              <NavLink to="/auctions" className={linkClass}>
                Auctions
              </NavLink>

              {isAdmin ? (
                <NavLink to="/admin" className={linkClass}>
                  Admin Hub
                </NavLink>
              ) : null}

              {!isAuthenticated ? (
                <>
                  <NavLink to="/login" className={linkClass}>
                    Login
                  </NavLink>
                  <NavLink to="/register" className={linkClass}>
                    Register
                  </NavLink>
                </>
              ) : null}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 rounded-[1.5rem] border border-slate-200/80 bg-white/90 px-2 py-1.5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.95)]">
                <div className="px-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Session
                  </p>
                  <p className="max-w-[10rem] truncate text-sm font-semibold text-slate-900">
                    {userName ?? 'Active account'}
                  </p>
                </div>

                <NavLink to="/account" className={linkClass}>
                  Account
                </NavLink>

                {isAdminSection ? (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                    Admin mode
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={onLogout}
                  disabled={isLoggingOut}
                  className="fin-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {isAuthenticated ? (
              <NavLink
                to="/account"
                className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 sm:inline-flex"
              >
                Account
              </NavLink>
            ) : null}

            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              <span className="relative block h-3.5 w-4">
                <span
                  className={[
                    'absolute left-0 top-0 block h-0.5 w-4 bg-slate-700 transition',
                    isMenuOpen ? 'translate-y-[6px] rotate-45' : '',
                  ].join(' ')}
                />
                <span
                  className={[
                    'absolute left-0 top-[6px] block h-0.5 w-4 bg-slate-700 transition',
                    isMenuOpen ? 'opacity-0' : 'opacity-100',
                  ].join(' ')}
                />
                <span
                  className={[
                    'absolute left-0 top-[12px] block h-0.5 w-4 bg-slate-700 transition',
                    isMenuOpen ? '-translate-y-[6px] -rotate-45' : '',
                  ].join(' ')}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <button
        type="button"
        onClick={closeMenu}
        className={[
          'fixed inset-0 z-40 bg-slate-950/38 transition-opacity duration-300 lg:hidden',
          isMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-label="Close navigation overlay"
      />

      <aside
        id="mobile-nav-drawer"
        className={[
          'fin-mobile-drawer fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl lg:hidden',
          'transition-transform duration-300 ease-out will-change-transform',
          isMenuOpen
            ? 'translate-x-0'
            : 'pointer-events-none translate-x-full',
        ].join(' ')}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Navigation
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {userName ?? 'Guest Session'}
            </p>
          </div>

          <button
            type="button"
            onClick={closeMenu}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
            aria-label="Close menu"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
          <NavLink to="/auctions" className={drawerLinkClass} onClick={closeMenu}>
            Auctions
          </NavLink>

          {isAuthenticated ? (
            <NavLink to="/account" className={drawerLinkClass} onClick={closeMenu}>
              Account
            </NavLink>
          ) : null}

          {isAdmin ? (
            <>
              <p className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Admin
              </p>
              <NavLink to="/admin" className={drawerLinkClass} onClick={closeMenu}>
                Admin Hub
              </NavLink>
            </>
          ) : null}

          {!isAuthenticated ? (
            <>
              <p className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Session
              </p>
              <NavLink to="/login" className={drawerLinkClass} onClick={closeMenu}>
                Login
              </NavLink>
              <NavLink to="/register" className={drawerLinkClass} onClick={closeMenu}>
                Register
              </NavLink>
            </>
          ) : null}
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="fin-btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        ) : null}
      </aside>
    </>
  )
}
