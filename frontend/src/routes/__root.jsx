/**
 * src/routes/__root.jsx
 * ──────────────────────
 * Root layout: persistent top navigation bar + outlet for child routes.
 */

import { useState, useEffect } from 'react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  Activity, Clock, Eye, Keyboard, LayoutDashboard,
  ScanSearch, Volume2, VolumeX, X
} from 'lucide-react'
import clsx from 'clsx'
import { isSoundEnabled, setSoundEnabled } from '../utils/soundEffects'

const NAV_LINKS = [
  { to: '/',        label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/inspect', label: 'Live Inspection', icon: ScanSearch },
  { to: '/history', label: 'History',    icon: Clock },
]

export default function RootLayout() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [soundOn, setSoundOn] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    setSoundOn(isSoundEnabled())
  }, [])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="no-print sticky top-0 z-50 border-b border-white/10
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

            {/* Controls & Status */}
            <div className="flex items-center gap-3">
              {/* Sound toggle button */}
              <button
                type="button"
                onClick={toggleSound}
                className={clsx(
                  'p-2 rounded-xl border text-xs transition-all duration-200 flex items-center gap-1.5',
                  soundOn
                    ? 'border-primary-500/30 bg-primary-500/10 text-primary-300 hover:bg-primary-500/20'
                    : 'border-white/10 bg-surface-800 text-slate-500 hover:text-slate-300'
                )}
                title={soundOn ? 'Звуковые сигналы включены' : 'Звуковые сигналы отключены'}
                aria-label="Toggle audio feedback"
              >
                {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Keyboard shortcuts info */}
              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="p-2 rounded-xl border border-white/10 bg-surface-800 text-slate-400
                  hover:text-white hover:border-white/20 transition-all text-xs"
                title="Горячие клавиши"
                aria-label="Show keyboard shortcuts"
              >
                <Keyboard size={16} />
              </button>

              {/* Status indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-500 pl-1 border-l border-white/10">
                <Activity size={13} className="text-success-400 animate-pulse" />
                <span className="hidden md:inline">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Keyboard Shortcuts Modal ──────────────────────────────────── */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 border-white/20 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-white font-bold">
                <Keyboard size={18} className="text-primary-400" />
                <span>Горячие клавиши оператора</span>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-300">Скрыть / показать разметку</span>
                <kbd className="px-2.5 py-1 rounded bg-surface-800 border border-white/20 text-primary-300 font-mono text-xs">H</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-300">Сброс масштаба Canvas (100%)</span>
                <kbd className="px-2.5 py-1 rounded bg-surface-800 border border-white/20 text-primary-300 font-mono text-xs">0</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-300">Новая инспекция / Отмена</span>
                <kbd className="px-2.5 py-1 rounded bg-surface-800 border border-white/20 text-primary-300 font-mono text-xs">Esc</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Колесико мыши на фото</span>
                <span className="text-slate-400 text-xs font-mono">Зум 1.0x – 5.0x</span>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setShowShortcuts(false)}
                className="btn-primary py-1.5 px-4 text-xs"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Content ──────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="no-print border-t border-white/8 mt-auto">
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

