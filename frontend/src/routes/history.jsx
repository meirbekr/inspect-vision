/**
 * src/routes/history.jsx  →  /history
 * ──────────────────────────────────────
 * Inspection history page wiring HistoryTable with live state management.
 */

import { useEffect } from 'react'
import { Clock } from 'lucide-react'
import HistoryTable    from '../components/HistoryTable'
import { useInspection } from '../hooks/useInspection'

export default function HistoryPage() {
  const {
    historyList,
    loading,
    filters,
    loadHistory,
    applyFilters,
    removeInspection,
    wipeHistory,
    downloadCsv,
  } = useInspection()

  // Load history on mount
  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Clock size={28} className="text-primary-400" />
          Inspection History
        </h1>
        <p className="text-slate-400 mt-1">
          Browse, filter, and export past product inspection records.
        </p>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <HistoryTable
        records={historyList}
        loading={loading}
        filters={filters}
        onApplyFilters={applyFilters}
        onDelete={removeInspection}
        onClear={wipeHistory}
        onExport={downloadCsv}
        onRefresh={loadHistory}
      />
    </div>
  )
}
