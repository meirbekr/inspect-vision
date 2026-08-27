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
    <div className="flex flex-col gap-6">
      {/* ── Back navigation ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 animate-fade-in">
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
          <h2 className="section-title">Annotated Image</h2>
          <DefectOverlay
            imageUrl={inspection?.imageUrl}
            defects={inspection?.defects ?? []}
          />
        </div>

        {/* Defect details */}
        <div className="flex flex-col gap-2">
          <DefectList defects={inspection?.defects ?? []} />
        </div>
      </div>
    </div>
  )
}
