/**
 * src/components/InspectionCard.jsx
 * ───────────────────────────────────
 * Summary card for a single inspection record.
 * Shows status badge, severity score dial, defect count, and timestamp.
 */

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Activity, Calendar, Check, CheckCircle2, Copy,
  Hash, Printer, ShieldAlert, ShieldCheck
} from 'lucide-react'
import clsx from 'clsx'

/**
 * Returns Tailwind colour classes for the severity score.
 * 80–100 = green (good), 50–79 = yellow (warning), 0–49 = red (critical)
 */
function severityColor(score) {
  if (score >= 80) return { ring: '#22c55e', text: 'text-success-400', label: 'Good' }
  if (score >= 50) return { ring: '#eab308', text: 'text-warning-400', label: 'Warn' }
  return { ring: '#ef4444', text: 'text-danger-400', label: 'Critical' }
}

/**
 * Circular SVG "dial" showing the severity score.
 */
function SeverityDial({ score }) {
  const { ring, text, label } = severityColor(score)
  const radius = 36
  const circ   = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" className="rotate-[-90deg]">
        {/* Track */}
        <circle cx="48" cy="48" r={radius} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        {/* Progress */}
        <circle cx="48" cy="48" r={radius} fill="none"
          stroke={ring} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      {/* Inner label */}
      <div className="relative" style={{ marginTop: '-78px', marginBottom: '18px' }}>
        <div className={clsx('text-2xl font-extrabold font-mono text-center leading-none', text)}>
          {score}
        </div>
        <div className="text-slate-500 text-xs text-center">{label}</div>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   inspection: import('../types').InspectionResult,
 *   compact?: boolean
 * }} props
 */
export default function InspectionCard({ inspection, compact = false }) {
  const [copied, setCopied] = useState(false)

  if (!inspection) return null

  const {
    inspectionId,
    timestamp,
    totalDefects,
    status,
    severityScore,
    defects = [],
  } = inspection

  const passed = status === 'passed'
  const { ring } = severityColor(severityScore)

  let formattedDate = timestamp
  try {
    formattedDate = format(parseISO(timestamp), "d MMM yyyy · HH:mm 'UTC'")
  } catch { /* keep raw */ }

  const handleCopySummary = async () => {
    const summaryText = [
      `📋 Акт инспекции: #${inspectionId}`,
      `Статус: ${passed ? '✅ PASSED' : '❌ FAILED'}`,
      `Оценка качества: ${severityScore}/100`,
      `Дефектов обнаружено: ${totalDefects} шт.`,
      defects.length > 0
        ? `Детализация: ${defects.map(d => `${d.type} (${Math.round(d.confidence * 100)}%)`).join(', ')}`
        : 'Дефекты отсутствуют',
      `Дата инспекции: ${formattedDate}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch { /* fallback */ }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={clsx(
      'glass-card overflow-hidden animate-slide-up',
      passed ? 'border-success-500/20' : 'border-danger-500/20',
    )}>
      {/* ── Top accent bar ─────────────────────────────────────────── */}
      <div
        className="h-1 w-full"
        style={{ background: passed ? '#22c55e' : '#ef4444' }}
      />

      <div className="p-5 flex flex-col gap-4">
        {/* ── Header row ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hash size={13} className="text-slate-500" />
              <span className="text-slate-400 text-xs font-mono">{inspectionId}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <Calendar size={12} />
              {formattedDate}
            </div>
          </div>

          {/* Actions & Status badge */}
          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="no-print p-1.5 rounded-xl border border-white/10 bg-surface-800 text-slate-400 hover:text-white hover:border-white/20 transition-all text-xs flex items-center gap-1.5"
              title="Скопировать сводку в буфер обмена"
            >
              {copied ? <Check size={14} className="text-success-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="no-print p-1.5 rounded-xl border border-white/10 bg-surface-800 text-slate-400 hover:text-white hover:border-white/20 transition-all text-xs flex items-center gap-1.5"
              title="Печать официального акта ОТК"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Печать</span>
            </button>

            {/* Status badge */}
            {passed ? (
              <div className="badge-passed">
                <ShieldCheck size={14} />
                Passed
              </div>
            ) : (
              <div className="badge-failed">
                <ShieldAlert size={14} />
                Failed
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className={clsx('grid gap-4', compact ? 'grid-cols-2' : 'grid-cols-3')}>
          {/* Severity dial */}
          {!compact && (
            <div className="flex flex-col items-center">
              <SeverityDial score={severityScore} />
              <span className="text-slate-500 text-xs -mt-1">Quality Score</span>
            </div>
          )}

          {/* Defect count */}
          <div className="stat-card items-center text-center">
            <Activity size={20} className={passed ? 'text-success-400' : 'text-danger-400'} />
            <div className={clsx(
              'text-3xl font-extrabold font-mono',
              passed ? 'text-success-400' : 'text-danger-400',
            )}>
              {totalDefects}
            </div>
            <div className="text-slate-500 text-xs">Defects Found</div>
          </div>

          {/* Score (compact mode shows this instead of dial) */}
          {compact && (
            <div className="stat-card items-center text-center">
              <div className="text-2xl font-extrabold font-mono"
                style={{ color: ring }}
              >
                {severityScore}
              </div>
              <div className="text-slate-500 text-xs">Quality Score</div>
            </div>
          )}

          {/* Defect types pill list */}
          {!compact && defects.length > 0 && (
            <div className="stat-card">
              <div className="text-slate-500 text-xs mb-1">Defect Types</div>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(defects.map(d => d.type))].map(t => (
                  <span key={t}
                    className="px-2 py-0.5 rounded-full bg-surface-700 text-slate-300
                      text-xs font-medium capitalize border border-white/10">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Passed message ─────────────────────────────────────────── */}
        {passed && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-success-500/10 border border-success-500/20 text-success-400 text-sm">
            <CheckCircle2 size={16} />
            Product meets quality standards — no defects detected.
          </div>
        )}
      </div>
    </div>
  )
}
