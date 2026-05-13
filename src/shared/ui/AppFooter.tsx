import { Link } from 'react-router-dom'

interface AppFooterProps {
  isAuthenticated: boolean
  isAdmin: boolean
}

export function AppFooter({ isAuthenticated, isAdmin }: AppFooterProps) {
  return (
    <footer className="fin-footer-shell">
      <div className="fin-footer-inner">
        <div className="fin-footer-panel">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.95fr)]">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#0f5de3,#12c3d7)] text-sm font-bold text-white shadow-[0_16px_34px_-18px_rgba(15,93,227,0.95)]">
                  AH
                </span>
                <div>
                  <p className="fin-title text-lg font-bold">AuctionHub</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Marketplace Infrastructure
                  </p>
                </div>
              </div>

              <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
                Enterprise-grade auction workflows for premium listings, trusted bidding activity, and structured market visibility.
              </p>
            </div>

            <div>
              <p className="fin-footer-heading">Marketplace</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>
                  <Link to="/auctions" className="fin-footer-link">
                    Live auctions
                  </Link>
                </li>
                <li>
                  <Link to="/auctions" className="fin-footer-link">
                    Market overview
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="fin-footer-heading">Session</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {isAuthenticated ? (
                  <>
                    <li>
                      <Link to="/account" className="fin-footer-link">
                        Account
                      </Link>
                    </li>
                    {isAdmin ? (
                      <li>
                        <Link to="/admin" className="fin-footer-link">
                          Admin hub
                        </Link>
                      </li>
                    ) : null}
                  </>
                ) : (
                  <>
                    <li>
                      <Link to="/login" className="fin-footer-link">
                        Login
                      </Link>
                    </li>
                    <li>
                      <Link to="/register" className="fin-footer-link">
                        Register
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <p className="fin-footer-heading">Operations</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Secure access flow</li>
                <li>Moderated market activity</li>
                <li>Structured auction lifecycle</li>
              </ul>
            </div>
          </div>

          <div className="col-span-full flex flex-col gap-3 border-t border-slate-200/90 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Built for controlled marketplace operations and high-trust auction participation.</p>
            <p>AuctionHub Platform</p>
          </div>
        </div>
      </div>
    </footer>
  )
}