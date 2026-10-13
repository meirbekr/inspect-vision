import { useState } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import DefectOverlay from './DefectOverlay'
import DefectList from './DefectList'
import InspectionCard from './InspectionCard'

export default function InspectionViewer({ inspection }) {
  const [selectedDefectIndex, setSelectedDefectIndex] = useState(null)

  if (!inspection) return null

  return (
    <>
      <div className="flex flex-col gap-4 animate-fade-in">
        {/* Status summary */}
        <div className={clsx(
          'flex items-center gap-3 px-5 py-3 rounded-2xl border font-semibold',
          inspection.status === 'passed'
            ? 'bg-success-500/10 border-success-500/30 text-success-400'
            : 'bg-danger-500/10 border-danger-500/30 text-danger-400',
        )}>
          {inspection.status === 'passed'
            ? <ShieldCheck size={22} />
            : <ShieldAlert size={22} />
          }
          <div>
            <div className="text-lg capitalize">{inspection.status}</div>
            <div className="text-sm font-normal opacity-70">
              Severity Score: <span className="font-mono font-bold">{inspection.severityScore}/100</span>
            </div>
          </div>
        </div>

        <DefectOverlay
          imageUrl={inspection.imageUrl}
          defects={inspection.defects}
          selectedDefectIndex={selectedDefectIndex}
        />
      </div>

      <div className="flex flex-col gap-4 animate-slide-up">
        <InspectionCard inspection={inspection} compact />
        <DefectList
          defects={inspection.defects}
          selectedDefectIndex={selectedDefectIndex}
          onSelectDefect={setSelectedDefectIndex}
        />
      </div>
    </>
  )
}
