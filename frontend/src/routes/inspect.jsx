/**
 * src/routes/inspect.jsx  →  /inspect
 * ──────────────────────────────────────
 * Real-time inspection view: upload image → run AI → view annotated result.
 */

import { RotateCcw, ScanSearch } from 'lucide-react'
import clsx from 'clsx'
import ImageUploader  from '../components/ImageUploader'
import InspectionViewer from '../components/InspectionViewer'
import { useInspection }  from '../hooks/useInspection'

export default function InspectPage() {
  const {
    currentInspection,
    loading,
    error,
    submitInspection,
    resetCurrent,
    clearError,
  } = useInspection()

  const hasResult = !!currentInspection

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ScanSearch size={28} className="text-primary-400" />
            Live Inspection
          </h1>
          <p className="text-slate-400 mt-1">
            Upload a product image to run AI-powered defect detection.
          </p>
        </div>

        {hasResult && (
          <button
            id="reset-inspection-btn"
            onClick={resetCurrent}
            className="btn-ghost animate-slide-up"
          >
            <RotateCcw size={15} />
            New Inspection
          </button>
        )}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className={clsx(
        'grid gap-6',
        hasResult ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto w-full',
      )}>
        {!hasResult ? (
          <div className="flex flex-col gap-4">
            {/* Upload panel */}
            <div className="glass-card p-6 animate-fade-in">
              <h2 className="section-title mb-4">Upload Image</h2>
              <ImageUploader
                onSubmit={submitInspection}
                loading={loading}
                error={error}
                onClearError={clearError}
              />
            </div>
          </div>
        ) : (
          <InspectionViewer inspection={currentInspection} />
        )}
      </div>

      {/* ── Loading overlay ──────────────────────────────────────────────── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center
          bg-surface-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-8 flex flex-col items-center gap-5 max-w-xs text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary-500/20 border-t-primary-500
                animate-spin" />
              <ScanSearch size={22} className="absolute inset-0 m-auto text-primary-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Analysing Image</p>
              <p className="text-slate-400 text-sm mt-1">Running AI defect detection…</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
