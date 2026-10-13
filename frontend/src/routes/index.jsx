/**
 * src/routes/index.jsx  →  /
 * ───────────────────────────
 * Dashboard page: quality control statistics + quick-start CTA.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity, AlertTriangle, ArrowRight, BarChart2, ChevronRight,
  CheckCircle2, Layers, ScanSearch, TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'
import { getHistory } from '../utils/apiClient'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-primary-400', delay = 0 }) {
  return (
    <div className="stat-card animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className={clsx('p-2.5 rounded-xl self-start', color.replace('text-', 'bg-').replace('400', '500/15'))}>
        <Icon size={18} className={color} />
      </div>
      <div className={clsx('text-3xl font-extrabold font-mono mt-1', color)}>{value}</div>
      <div className="text-slate-300 text-sm font-medium">{label}</div>
      {sub && <div className="text-slate-500 text-xs">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getHistory()
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = records.length
    const passed   = records.filter(r => r.status === 'passed').length
    const failed   = total - passed
    const passRate = total === 0 ? 0 : Math.round((passed / total) * 100)
    const avgScore = total === 0
      ? 100
      : Math.round(records.reduce((s, r) => s + (r.severityScore ?? 100), 0) / total)

    // Most common defect type & distribution
    const typeCounts = {}
    let totalDefectsCount = 0
    records.forEach(r => {
      (r.defects ?? []).forEach(d => {
        typeCounts[d.type] = (typeCounts[d.type] ?? 0) + 1
        totalDefectsCount += 1
      })
    })
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    const distribution = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      pct: totalDefectsCount > 0 ? Math.round((count / totalDefectsCount) * 100) : 0,
    }))

    return { total, passed, failed, passRate, avgScore, topType, totalDefectsCount, distribution }
  }, [records])

  // ── Recent inspections ─────────────────────────────────────────────────────
  const recent = records.slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Quality Control Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time overview of your manufacturing inspection metrics.
          </p>
        </div>
        <Link to="/inspect" className="btn-primary">
          <ScanSearch size={18} />
          New Inspection
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BarChart2}    label="Total Inspections" value={stats.total}             color="text-primary-400"  delay={0} />
          <StatCard icon={TrendingUp}   label="Pass Rate"         value={`${stats.passRate}%`}    color="text-success-400"  delay={80}
            sub={`${stats.passed} passed · ${stats.failed} failed`} />
          <StatCard icon={Activity}     label="Avg Quality Score" value={stats.avgScore}           color={stats.avgScore >= 80 ? 'text-success-400' : stats.avgScore >= 50 ? 'text-warning-400' : 'text-danger-400'} delay={160} />
          <StatCard icon={AlertTriangle} label="Top Defect Type"  value={<span className="capitalize">{stats.topType}</span>} color="text-orange-400" delay={240} />
        </div>
      )}

      {/* ── Analytical breakdowns ─────────────────────────────────────── */}
      {!loading && stats.total > 0 && (
        <div className="grid md:grid-cols-2 gap-4 animate-slide-up delay-300">
          {/* Pass / Fail ratio */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title text-base flex items-center gap-2">
                <Layers size={16} className="text-primary-400" />
                Pass / Fail Ratio
              </h2>
              <span className="text-slate-500 text-sm font-mono">{stats.total} total</span>
            </div>
            <div className="h-3 rounded-full bg-surface-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-success-500 to-success-400 transition-all duration-1000"
                style={{ width: `${stats.passRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={11} className="text-success-400" />
                {stats.passed} Passed ({stats.passRate}%)
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle size={11} className="text-danger-400" />
                {stats.failed} Failed
              </span>
            </div>
          </div>

          {/* Defect distribution */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title text-base flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning-400" />
                Распределение дефектов
              </h2>
              <span className="text-slate-500 text-sm font-mono">{stats.totalDefectsCount} дефектов</span>
            </div>
            {stats.distribution.length === 0 ? (
              <p className="text-slate-500 text-xs py-2">Дефекты не зафиксированы</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {stats.distribution.map(({ type, count, pct }) => (
                  <div key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800 border border-white/5 text-xs">
                    <span className="font-medium text-slate-200 capitalize">{type}</span>
                    <span className="font-mono text-primary-400 font-bold">{count}</span>
                    <span className="text-slate-500 text-[10px]">({pct}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recent inspections ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 animate-slide-up delay-200">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recent Inspections</h2>
          <Link to="/history" className="text-primary-400 hover:text-primary-300 text-sm
            flex items-center gap-1 transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-12 gap-3 text-center">
            <ScanSearch size={36} className="text-slate-600" />
            <p className="text-slate-400">No inspections yet.</p>
            <Link to="/inspect" className="btn-primary mt-1">
              Start First Inspection <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((record, idx) => {
              const passed = record.status === 'passed'
              return (
                <Link
                  key={record.inspectionId}
                  to="/details/$id"
                  params={{ id: record.inspectionId }}
                  className="glass-card p-4 flex items-center gap-4
                    hover:border-white/20 transition-all duration-200 animate-slide-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className={clsx(
                    'w-2 h-10 rounded-full shrink-0',
                    passed ? 'bg-success-500' : 'bg-danger-500',
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-slate-400">{record.inspectionId}</div>
                    <div className="text-slate-300 text-sm font-medium truncate">
                      {record.totalDefects === 0
                        ? 'No defects — passed'
                        : `${record.totalDefects} defect${record.totalDefects > 1 ? 's' : ''} detected`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={clsx(
                      'text-xs font-bold font-mono',
                      record.severityScore >= 80 ? 'text-success-400'
                        : record.severityScore >= 50 ? 'text-warning-400' : 'text-danger-400',
                    )}>
                      {record.severityScore}/100
                    </div>
                    <div className="text-slate-600 text-xs">score</div>
                  </div>
                  <ChevronRight size={14} className="text-slate-600" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick start CTA (shown when no inspections) ────────────────── */}
      {!loading && stats.total === 0 && (
        <div className="glass-card p-8 flex flex-col items-center text-center gap-4 animate-fade-in
          bg-gradient-to-br from-primary-900/30 to-surface-800 border-primary-500/20">
          <div className="p-4 rounded-2xl bg-primary-500/15 border border-primary-500/30">
            <ScanSearch size={40} className="text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Get Started</h2>
            <p className="text-slate-400 mt-1 max-w-sm">
              Upload your first product image to run an AI-powered defect inspection.
            </p>
          </div>
          <Link to="/inspect" id="quick-start-btn" className="btn-primary text-base px-8 py-3">
            <ScanSearch size={20} />
            Quick Start Inspection
            <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  )
}

