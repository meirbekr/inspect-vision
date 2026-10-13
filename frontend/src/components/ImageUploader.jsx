/**
 * src/components/ImageUploader.jsx
 * ──────────────────────────────────
 * Drag-and-drop + click-to-browse image uploader with live preview,
 * loading spinner, and inline error banners.
 */

import { useCallback, useRef, useState } from 'react'
import {
  AlertCircle, CheckCircle2, ImagePlus, Loader2,
  Sparkles, Upload, X
} from 'lucide-react'
import clsx from 'clsx'
import {
  createCleanSampleFile,
  createCrackSampleFile,
  createDefectiveSampleFile
} from '../utils/demoSamples'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

/**
 * @param {{ onSubmit: (file: File) => Promise<void>, loading: boolean, error: string|null, onClearError: () => void }} props
 */
export default function ImageUploader({ onSubmit, loading, error, onClearError }) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview]       = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [localError, setLocalError] = useState(null)
  const [sampleLoading, setSampleLoading] = useState(null)
  const inputRef = useRef(null)

  // ── File validation & preview ─────────────────────────────────────────────
  const processFile = useCallback((file) => {
    setLocalError(null)
    onClearError?.()

    if (!ALLOWED_TYPES.includes(file.type)) {
      setLocalError('Unsupported file type. Please upload a JPG or PNG image.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError('File size exceeds 10 MB. Please choose a smaller image.')
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)
    setSelectedFile(file)
  }, [onClearError])

  // ── Drag events ───────────────────────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true)  }
  const handleDragLeave = ()  => setDragActive(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // ── File input change ─────────────────────────────────────────────────────
  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  // ── Quick demo sample loader ─────────────────────────────────────────────
  const handleLoadSample = async (type) => {
    setSampleLoading(type)
    try {
      let file
      if (type === 'clean') file = await createCleanSampleFile()
      else if (type === 'crack') file = await createCrackSampleFile()
      else if (type === 'defects') file = await createDefectiveSampleFile()
      if (file) processFile(file)
    } finally {
      setSampleLoading(null)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedFile || loading) return
    await onSubmit(selectedFile)
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPreview(null)
    setSelectedFile(null)
    setLocalError(null)
    onClearError?.()
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayError = localError || error

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* ── Dropzone ────────────────────────────────────────────────────── */}
      <div
        id="image-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !preview && inputRef.current?.click()}
        className={clsx(
          'relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer',
          'flex flex-col items-center justify-center text-center min-h-[260px] p-8',
          dragActive
            ? 'border-primary-400 bg-primary-500/10 shadow-glow-blue scale-[1.01]'
            : preview
              ? 'border-white/20 bg-surface-800 cursor-default'
              : 'border-white/20 bg-surface-800/60 hover:border-primary-500/60 hover:bg-primary-500/5',
        )}
      >
        {preview ? (
          /* ── Image preview ──────────────────────────────────────────── */
          <div className="relative w-full flex flex-col items-center gap-3 animate-fade-in">
            <button
              id="remove-image-btn"
              onClick={(e) => { e.stopPropagation(); handleReset() }}
              className="absolute top-0 right-0 p-1.5 rounded-full bg-surface-700 hover:bg-danger-600/40
                text-slate-400 hover:text-danger-400 transition-all duration-200 z-10"
              aria-label="Remove image"
            >
              <X size={16} />
            </button>
            <img
              src={preview}
              alt="Selected product"
              className="max-h-48 max-w-full object-contain rounded-xl border border-white/10 shadow-card"
            />
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle2 size={14} className="text-success-400" />
              <span className="font-mono text-xs text-slate-400 truncate max-w-[240px]">
                {selectedFile?.name}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">{(selectedFile?.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        ) : (
          /* ── Empty state ────────────────────────────────────────────── */
          <div className="flex flex-col items-center gap-4 pointer-events-none">
            <div className={clsx(
              'p-5 rounded-2xl transition-all duration-300',
              dragActive ? 'bg-primary-500/20' : 'bg-surface-700',
            )}>
              {dragActive
                ? <Upload size={36} className="text-primary-400 animate-bounce" />
                : <ImagePlus size={36} className="text-slate-500" />
              }
            </div>
            <div>
              <p className="text-slate-300 font-semibold text-base mb-1">
                {dragActive ? 'Drop your image here' : 'Drag & drop your image'}
              </p>
              <p className="text-slate-500 text-sm">
                or <span className="text-primary-400 font-medium">click to browse</span>
              </p>
              <p className="text-slate-600 text-xs mt-2">JPG, PNG · Max 10 MB</p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          id="file-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleChange}
          className="hidden"
          aria-label="Upload product image"
        />
      </div>

      {/* ── Quick Demo Samples ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-800/40 border border-white/5 animate-slide-up">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles size={14} className="text-primary-400" />
          <span className="font-semibold text-slate-300">Быстрые демо-образцы:</span>
          <span>загрузка в 1 клик для тестирования</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleLoadSample('clean')}
            disabled={loading || sampleLoading !== null}
            className="px-2.5 py-1.5 rounded-lg border border-success-500/30 bg-success-500/10 hover:bg-success-500/20 text-success-300 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {sampleLoading === 'clean' ? <Loader2 size={12} className="animate-spin" /> : <span className="w-2 h-2 rounded-full bg-success-400" />}
            Чистая деталь (Pass)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('crack')}
            disabled={loading || sampleLoading !== null}
            className="px-2.5 py-1.5 rounded-lg border border-danger-500/30 bg-danger-500/10 hover:bg-danger-500/20 text-danger-300 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {sampleLoading === 'crack' ? <Loader2 size={12} className="animate-spin" /> : <span className="w-2 h-2 rounded-full bg-danger-400" />}
            Трещина (Crack)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('defects')}
            disabled={loading || sampleLoading !== null}
            className="px-2.5 py-1.5 rounded-lg border border-warning-500/30 bg-warning-500/10 hover:bg-warning-500/20 text-warning-300 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {sampleLoading === 'defects' ? <Loader2 size={12} className="animate-spin" /> : <span className="w-2 h-2 rounded-full bg-warning-400" />}
            Царапины и вмятины
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {displayError && (
        <div
          role="alert"
          className="flex items-start gap-3 px-4 py-3 rounded-xl
            bg-danger-500/10 border border-danger-500/30 text-danger-400
            animate-slide-up text-sm"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{displayError}</span>
          <button
            onClick={() => { setLocalError(null); onClearError?.() }}
            className="text-danger-500/60 hover:text-danger-400 transition-colors"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Submit button ────────────────────────────────────────────────── */}
      {selectedFile && (
        <button
          id="run-inspection-btn"
          onClick={handleSubmit}
          disabled={loading}
          className={clsx(
            'btn-primary w-full py-3 text-base animate-slide-up',
            loading && 'opacity-70 cursor-not-allowed',
          )}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Analysing image…
            </>
          ) : (
            <>
              <Upload size={18} />
              Run Inspection
            </>
          )}
        </button>
      )}
    </div>
  )
}
