/**
 * src/components/HistoryTable.jsx
 * ────────────────────────────────
 * Responsive data table for inspection history with filter controls,
 * action buttons (view, delete, export CSV, clear all).
 */

import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Calendar, ChevronRight, Download, Filter, Loader2,
  RefreshCw, Search, ShieldAlert, ShieldCheck, Trash2, X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

const DEFECT_TYPE_OPTIONS = [
  { value: '',             label: 'All Types'    },
  { value: 'scratch',      label: 'Scratch'      },
  { value: 'dent',         label: 'Dent'         },
  { value: 'crack',        label: 'Crack'        },
  { value: 'discoloration', label: 'Discoloration' },
]

function SeverityBadge({ score }) {
  const cls = score >= 80
    ? 'bg-success-500/15 text-success-400 border-success-500/30'
    : score >= 50
      ? 'bg-warning-500/15 text-warning-400 border-warning-500/30'
      : 'bg-danger-500/15 text-danger-400 border-danger-500/30'
  return (
    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold border', cls)}>
      {score}
    </span>
  )
}

/**
 * @param {{
 *   records: Array,
 *   loading: boolean,
 *   filters: { startDate: string, endDate: string, defectType: string },
 *   onApplyFilters: (f: object) => void,
 *   onDelete: (id: string) => void,
 *   onClear: () => void,
 *   onExport: () => void,
 *   onRefresh: () => void,
 * }} props
 */
export default function HistoryTable({
  records = [],
  loading = false,
  filters,
  onApplyFilters,
  onDelete,
  onClear,
  onExport,
  onRefresh,
}) {
  const navigate = useNavigate()
  const [localFilters, setLocalFilters] = useState(filters ?? { startDate: '', endDate: '', defectType: '' })
  const [confirmClear, setConfirmClear] = useState(false)

  const handleFilterChange = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onApplyFilters?.(localFilters)
  }

  const handleClear = () => {
    const cleared = { startDate: '', endDate: '', defectType: '' }
    setLocalFilters(cleared)
    onApplyFilters?.(cleared)
  }

  const handleConfirmClear = useCallback(() => {
    if (confirmClear) {
      onClear?.()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }, [confirmClear, onClear])

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 flex-wrap items-end">
        <div className="flex items-center gap-2 text-slate-400 shrink-0">
          <Filter size={15} />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Start Date</label>
            <input
              type="date"
              id="filter-start-date"
              value={localFilters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">End Date</label>
            <input
              type="date"
              id="filter-end-date"
              value={localFilters.endDate}
              onChange={e => handleFilterChange('endDate', e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Defect Type</label>
            <select
              id="filter-defect-type"
              value={localFilters.defectType}
              onChange={e => handleFilterChange('defectType', e.target.value)}
              className="input-field text-xs"
            >
              {DEFECT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button id="apply-filters-btn" onClick={handleApply} className="btn-primary py-2 text-xs">
            <Search size={13} /> Apply
          </button>
          <button id="clear-filters-btn" onClick={handleClear} className="btn-ghost py-2 text-xs">
            <X size={13} /> Clear
          </button>
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Calendar size={14} />
          <span>{records.length} record{records.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button id="refresh-btn" onClick={onRefresh} className="btn-ghost py-2 text-xs">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button id="export-csv-btn" onClick={onExport} className="btn-ghost py-2 text-xs">
            <Download size={13} /> Export CSV
          </button>
          <button
            id="clear-all-btn"
            onClick={handleConfirmClear}
            className={clsx('text-xs py-2', confirmClear ? 'btn-danger' : 'btn-ghost')}
          >
            <Trash2 size={13} />
            {confirmClear ? 'Confirm Clear All?' : 'Clear All'}
          </button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 size={22} className="animate-spin" />
          <span>Loading history…</span>
        </div>
      ) : records.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ShieldCheck size={40} className="text-slate-600" />
          <p className="text-slate-400 font-medium">No inspection records found</p>
          <p className="text-slate-600 text-sm">Run an inspection to see results here.</p>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Timestamp', 'ID', 'Defects', 'Status', 'Score', 'Actions'].map(h => (
                  <th key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.map((record, idx) => {
                const passed = record.status === 'passed'
                let ts = record.timestamp
                try { ts = format(parseISO(record.timestamp), 'd MMM yy, HH:mm') } catch { /* keep */ }

                return (
                  <tr
                    key={record.inspectionId}
                    className="hover:bg-white/[0.03] transition-colors group animate-fade-in"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono text-xs">{ts}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-mono text-xs">{record.inspectionId}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'font-bold text-base',
                        record.totalDefects === 0 ? 'text-success-400' : 'text-danger-400',
                      )}>
                        {record.totalDefects}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {passed ? (
                        <div className="badge-passed">
                          <ShieldCheck size={11} /> Passed
                        </div>
                      ) : (
                        <div className="badge-failed">
                          <ShieldAlert size={11} /> Failed
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge score={record.severityScore} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          id={`view-btn-${record.inspectionId}`}
                          onClick={() => navigate({ to: '/details/$id', params: { id: record.inspectionId } })}
                          className="btn-ghost py-1 px-2 text-xs"
                          aria-label={`View inspection ${record.inspectionId}`}
                        >
                          View <ChevronRight size={12} />
                        </button>
                        <button
                          id={`delete-btn-${record.inspectionId}`}
                          onClick={() => onDelete?.(record.inspectionId)}
                          className="btn-danger py-1 px-2 text-xs"
                          aria-label={`Delete inspection ${record.inspectionId}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
