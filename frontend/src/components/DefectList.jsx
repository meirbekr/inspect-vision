/**
 * src/components/DefectList.jsx
 * ──────────────────────────────
 * Renders a grid of detected defects with type icons, colour-coded confidence
 * percentages, and bounding box coordinate metadata.
 */

import { AlertTriangle, CheckCircle2, Crosshair, Layers, Paintbrush, Slash, Wrench } from 'lucide-react'
import clsx from 'clsx'

// ── Defect type → icon mapping ─────────────────────────────────────────────
const DEFECT_ICONS = {
  scratch:       Slash,
  dent:          Wrench,
  crack:         AlertTriangle,
  discoloration: Paintbrush,
}

const DEFECT_COLORS = {
  scratch:       'text-orange-400 bg-orange-500/10 border-orange-500/30',
  dent:          'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  crack:         'text-red-400    bg-red-500/10    border-red-500/30',
  discoloration: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
}

/**
 * Colour for confidence percentage based on threshold rules.
 * @param {number} confidence
 */
function confidenceStyle(confidence) {
  if (confidence > 0.90) return 'text-green-400'
  if (confidence >= 0.70) return 'text-yellow-400'
  return 'text-red-400'
}

function confidenceLabel(confidence) {
  if (confidence > 0.90) return { label: 'High', cls: 'bg-green-500/15 text-green-400 border-green-500/30' }
  if (confidence >= 0.70) return { label: 'Medium', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' }
  return { label: 'Low', cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
}

/**
 * @param {{
 *   defects: Array,
 *   selectedDefectIndex?: number|null,
 *   onSelectDefect?: (index: number|null) => void,
 *   className?: string
 * }} props
 */
export default function DefectList({
  defects = [],
  selectedDefectIndex = null,
  onSelectDefect,
  className,
}) {
  if (!defects || defects.length === 0) {
    return (
      <div className={clsx(
        'flex flex-col items-center justify-center gap-3 py-10 rounded-2xl',
        'border border-white/10 bg-surface-800/50 text-center',
        className,
      )}>
        <CheckCircle2 size={40} className="text-success-400" />
        <div>
          <p className="text-white font-semibold">Дефектов не обнаружено</p>
          <p className="text-slate-500 text-sm mt-1">Деталь успешно прошла контроль качества.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('flex flex-col gap-3 animate-fade-in', className)}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="section-title flex items-center gap-2">
          <Layers size={18} className="text-primary-400" />
          Найденные дефекты
        </h3>
        <span className="px-2.5 py-0.5 rounded-full bg-danger-500/20 text-danger-400
          border border-danger-500/30 text-xs font-bold">
          {defects.length} шт.
        </span>
      </div>

      <p className="text-slate-500 text-xs">
        Наведите на дефект для фокусировки на изображении
      </p>

      {/* ── Defect cards ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {defects.map((defect, idx) => {
          const Icon = DEFECT_ICONS[defect.type] ?? Crosshair
          const typeStyle = DEFECT_COLORS[defect.type] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/30'
          const confStyle = confidenceStyle(defect.confidence)
          const { label: confLabel, cls: confCls } = confidenceLabel(defect.confidence)
          const bb = defect.boundingBox
          const isSelected = selectedDefectIndex === idx

          return (
            <div
              key={idx}
              onMouseEnter={() => onSelectDefect?.(idx)}
              onMouseLeave={() => onSelectDefect?.(null)}
              onClick={() => onSelectDefect?.(isSelected ? null : idx)}
              className={clsx(
                'glass-card p-4 flex items-start gap-4 animate-slide-up transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'border-primary-500/60 bg-primary-500/15 shadow-glow-blue scale-[1.01]'
                  : 'hover:border-white/20'
              )}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Icon badge */}
              <div className={clsx('p-2.5 rounded-xl border shrink-0', typeStyle)}>
                <Icon size={18} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-semibold text-white capitalize">{defect.type}</span>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', confCls)}>
                    {confLabel}
                  </span>
                </div>

                {/* Confidence bar */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.round(defect.confidence * 100)}%`,
                        backgroundColor: defect.confidence > 0.90 ? '#22c55e'
                          : defect.confidence >= 0.70 ? '#eab308'
                          : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={clsx('text-sm font-mono font-bold shrink-0', confStyle)}>
                    {Math.round(defect.confidence * 100)}%
                  </span>
                </div>

                {/* Bounding box coordinates */}
                {bb && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'X', value: bb.x },
                      { label: 'Y', value: bb.y },
                      { label: 'W', value: bb.width },
                      { label: 'H', value: bb.height },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-surface-700/60 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-slate-500 text-xs">{label}</div>
                        <div className="text-slate-200 text-xs font-mono font-semibold">{value}px</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
