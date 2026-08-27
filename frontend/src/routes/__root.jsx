/**
 * src/routes/__root.jsx
 * ──────────────────────
 * Root layout: persistent top navigation bar + outlet for child routes.
 */

import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Activity, Clock, Eye, LayoutDashboard, ScanSearch } from 'lucide-react'
import clsx from 'clsx'

const NAV_LINKS = [
  { to: '/',        label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/inspect', label: 'Live Inspection', icon: ScanSearch },
  { to: '/history', label: 'History',    icon: Clock },
]

export default function RootLayout() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10
        bg-surface-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-2 rounded-xl bg-primary-600/20 border border-primary-500/30
                group-hover:bg-primary-600/30 transition-all duration-200">
                <Eye size={20} className="text-primary-400" />
              </div>
              <div>
                <span className="font-extrabold text-white text-lg tracking-tight leading-none">
                  Inspect<span className="text-primary-400">Vision</span>
                </span>
                <div className="text-slate-500 text-xs leading-none">AI Quality Control</div>
              </div>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1" aria-label="Main navigation">
              {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => {
                const active = exact
                  ? currentPath === to
                  : currentPath.startsWith(to)

                return (
                  <Link
                    key={to}
                    to={to}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/8',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={15} />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Activity size={13} className="text-success-400 animate-pulse" />
              <span className="hidden md:inline">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>© 2025 Inspect-Vision · AI-Powered Quality Control</span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
