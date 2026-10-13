/**
 * src/routes/details.$id.jsx  →  /details/:id
 * ──────────────────────────────────────────────
 * Detailed inspection view for a specific record fetched by ID.
 */

import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import InspectionCard from '../components/InspectionCard'
import DefectOverlay  from '../components/DefectOverlay'
import DefectList     from '../components/DefectList'
import { getInspectionById } from '../utils/apiClient'

export default function DetailsPage() {
  const { id }         = useParams({ from: '/details/$id' })
  const [inspection, setInspection] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [selectedDefectIndex, setSelectedDefectIndex] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    getInspectionById(id)
      .then(setInspection)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400 animate-fade-in">
        <Loader2 size={36} className="animate-spin text-primary-400" />
        <p>Loading inspection record…</p>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fade-in">
        <div className="p-4 rounded-2xl bg-danger-500/10 border border-danger-500/30">
          <AlertCircle size={36} className="text-danger-400" />
        </div>
        <p className="text-white font-semibold text-lg">Inspection Not Found</p>
        <p className="text-slate-400 text-sm">{error}</p>
        <Link to="/history" className="btn-ghost mt-2">
          <ArrowLeft size={15} /> Back to History
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 printable-document">
      {/* ── Official Print Header (Only visible on paper print) ───────────── */}
      <div className="print-only mb-6 border-b-2 border-black pb-4 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase">Акт контроля качества визуального осмотра</h1>
            <p className="text-xs text-gray-600 mt-1">Система автоматизированного контроля Inspect-Vision AI</p>
          </div>
          <div className="text-right text-xs font-mono">
            <div>ID: <strong>{id}</strong></div>
            <div>Дата: {inspection?.timestamp}</div>
          </div>
        </div>
      </div>

      {/* ── Back navigation (hidden on print) ────────────────────────────── */}
      <div className="no-print flex items-center gap-4 animate-fade-in">
        <Link to="/history" className="btn-ghost py-2">
          <ArrowLeft size={15} /> Back to History
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Inspection Detail
          </h1>
          <p className="text-slate-500 text-xs font-mono">{id}</p>
        </div>
      </div>

      {/* ── Summary card ─────────────────────────────────────────────────── */}
      <InspectionCard inspection={inspection} />

      {/* ── Two-column detail ─────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6 animate-slide-up">
        {/* Annotated image */}
        <div className="flex flex-col gap-2">
          <h2 className="section-title">Размеченное изображение</h2>
          <DefectOverlay
            imageUrl={inspection?.imageUrl}
            defects={inspection?.defects ?? []}
            selectedDefectIndex={selectedDefectIndex}
          />
        </div>

        {/* Defect details */}
        <div className="flex flex-col gap-2">
          <DefectList
            defects={inspection?.defects ?? []}
            selectedDefectIndex={selectedDefectIndex}
            onSelectDefect={setSelectedDefectIndex}
          />
        </div>
      </div>

      {/* ── Print Signature Section (Only visible on paper print) ─────────── */}
      <div className="print-only mt-12 pt-6 border-t border-gray-400 text-black text-xs">
        <div className="grid grid-cols-2 gap-12">
          <div>
            <div className="mb-8">Контролёр ОТК: _______________________ (подпись)</div>
            <div>Ф.И.О.: ____________________________________</div>
          </div>
          <div className="text-right">
            <div className="mb-8">Штамп ОТК: _______________________</div>
            <div>Дата проверки: ____________________________________</div>
          </div>
        </div>
      </div>
    </div>
  )
}
