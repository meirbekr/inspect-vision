/**
 * src/components/DefectOverlay.jsx
 * ──────────────────────────────────
 * HTML5 Canvas-based component with:
 *  - Colour-coded defect bounding box overlays
 *  - Interactive Zoom (1.0x – 5.0x) & Pan
 *  - Overlay toggle (Clean image vs Annotated, hotkey 'H')
 *  - Active defect highlight (when hovered/selected in DefectList)
 *  - Image download
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Download, Eye, EyeOff, ImageOff, RotateCcw,
  ZoomIn, ZoomOut
} from 'lucide-react'
import clsx from 'clsx'

function confidenceColor(confidence) {
  if (confidence > 0.90) return '#00c853'   // green
  if (confidence >= 0.70) return '#ffd600'  // yellow
  return '#f44336'                           // red
}

export default function DefectOverlay({
  imageUrl,
  defects = [],
  selectedDefectIndex = null,
  className,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const imgRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [showOverlay, setShowOverlay] = useState(true)
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // ── Draw function ─────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return

    const ctx = canvas.getContext('2d')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    ctx.save()

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply zoom & pan transformations
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y)
    ctx.scale(zoom, zoom)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    // 1. Draw base image
    ctx.drawImage(img, 0, 0)

    // 2. Draw defects (if overlay is enabled)
    if (showOverlay && defects.length > 0) {
      defects.forEach((defect, index) => {
        const isSelected = selectedDefectIndex === index
        const isOther = selectedDefectIndex !== null && !isSelected

        ctx.save()

        // Dim non-selected defects when one is focused
        if (isOther) {
          ctx.globalAlpha = 0.25
        }

        const { x, y, width, height } = defect.boundingBox
        const conf = defect.confidence
        const color = confidenceColor(conf)
        const label = `${defect.type} (${Math.round(conf * 100)}%)`

        // Box styling
        ctx.strokeStyle = color
        const baseLineWidth = Math.max(2, img.naturalWidth / 320)
        ctx.lineWidth = isSelected ? baseLineWidth * 2 : baseLineWidth

        if (isSelected) {
          ctx.shadowColor = color
          ctx.shadowBlur = 12
        }

        ctx.strokeRect(x, y, width, height)

        // Label tag
        const fontSize = Math.max(12, img.naturalWidth / 60)
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
        const metrics = ctx.measureText(label)
        const textW = metrics.width + 8
        const textH = fontSize + 6
        const labelY = y > textH + 4 ? y - textH - 2 : y + 2

        ctx.fillStyle = color
        ctx.fillRect(x - 1, labelY, textW, textH)

        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, x + 3, labelY + fontSize)

        ctx.restore()
      })
    }

    ctx.restore()
    setReady(true)
  }, [defects, showOverlay, zoom, pan, selectedDefectIndex])

  // ── Load image ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!imageUrl) return
    setReady(false)
    setZoom(1.0)
    setPan({ x: 0, y: 0 })

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      draw()
    }
    img.onerror = () => setReady(false)
    img.src = imageUrl
  }, [imageUrl, draw])

  // Redraw whenever draw dependencies change
  useEffect(() => {
    if (imgRef.current?.complete) {
      draw()
    }
  }, [draw])

  // ── Zoom controls ─────────────────────────────────────────────────────────
  const handleZoomIn = () => setZoom(z => Math.min(5.0, Number((z + 0.25).toFixed(2))))
  const handleZoomOut = () => setZoom(z => Math.max(1.0, Number((z - 0.25).toFixed(2))))
  const handleResetView = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
  }

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.2 : -0.2
    setZoom(z => Math.min(5.0, Math.max(1.0, Number((z + delta).toFixed(2)))))
  }

  // ── Mouse drag for pan ────────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    if (zoom <= 1.0) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1.0) return
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // ── Keyboard shortcuts ('H' and '0') ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
        setShowOverlay(v => !v)
      } else if (e.key === '0') {
        handleResetView()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Download canvas ───────────────────────────────────────────────────────
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `inspection_annotated_${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (!imageUrl) {
    return (
      <div className={clsx(
        'flex flex-col items-center justify-center gap-3 min-h-[220px]',
        'rounded-2xl border border-white/10 bg-surface-800/50 text-slate-500',
        className,
      )}>
        <ImageOff size={36} />
        <p className="text-sm">No image to display</p>
      </div>
    )
  }

  return (
    <div className={clsx('flex flex-col gap-3 animate-fade-in', className)}>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="no-print flex items-center justify-between flex-wrap gap-2 px-1">
        <div className="flex items-center gap-2">
          {/* Overlay visibility toggle */}
          <button
            type="button"
            onClick={() => setShowOverlay(v => !v)}
            className={clsx(
              'px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all',
              showOverlay
                ? 'bg-primary-600/20 text-primary-300 border-primary-500/30 hover:bg-primary-600/30'
                : 'bg-surface-800 text-slate-400 border-white/10 hover:text-white'
            )}
            title="Переключить разметку дефектов (Горячая клавиша: H)"
          >
            {showOverlay ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{showOverlay ? 'Разметка включена' : 'Оригинал'}</span>
            <kbd className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono text-slate-400">H</kbd>
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-surface-800/90 border border-white/10 rounded-xl p-1 text-xs">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1.0}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Уменьшить масштаб"
          >
            <ZoomOut size={14} />
          </button>

          <span className="font-mono text-slate-200 px-1.5 text-xs select-none">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 5.0}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Увеличить масштаб"
          >
            <ZoomIn size={14} />
          </button>

          {(zoom > 1.0 || pan.x !== 0 || pan.y !== 0) && (
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 ml-0.5 rounded-lg text-primary-400 hover:bg-primary-500/10"
              title="Сброс масштаба (Горячая клавиша: 0)"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Canvas container ────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={clsx(
          'canvas-container relative select-none overflow-hidden rounded-xl border border-white/10 bg-surface-950/40',
          zoom > 1.0 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        )}
      >
        <canvas
          ref={canvasRef}
          id="defect-canvas"
          aria-label="Annotated inspection image with defect bounding boxes"
          className="w-full h-auto rounded-xl block transition-transform duration-75"
        />

        {/* Loading skeleton while image draws */}
        {!ready && (
          <div className="skeleton min-h-[260px] rounded-xl" />
        )}

        {/* Zoom badge hint */}
        {zoom > 1.0 && (
          <div className="no-print absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-mono px-2.5 py-1 rounded-lg border border-white/10 pointer-events-none">
            Перетаскивайте для перемещения
          </div>
        )}
      </div>

      {/* ── Download button ─────────────────────────────────────────────── */}
      {ready && (
        <button
          id="download-annotated-btn"
          onClick={handleDownload}
          className="no-print btn-ghost w-full justify-center animate-slide-up"
          aria-label="Download annotated inspection image"
        >
          <Download size={16} />
          Скачать размеченное изображение
        </button>
      )}
    </div>
  )
}
