/**
 * src/components/DefectOverlay.jsx
 * ──────────────────────────────────
 * HTML5 Canvas-based component that renders the inspected image with
 * colour-coded defect bounding box overlays.
 *
 * Colour rules (match backend draw_bounding_boxes):
 *   Green  (#00c853) – confidence > 90%
 *   Yellow (#ffd600) – confidence 70% – 90%
 *   Red    (#f44336) – confidence < 70%
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, ImageOff, ZoomIn } from 'lucide-react'
import clsx from 'clsx'

/**
 * Map a confidence float to a hex colour string.
 * @param {number} confidence - 0.0 to 1.0
 * @returns {string} Hex colour
 */
function confidenceColor(confidence) {
  if (confidence > 0.90) return '#00c853'   // green
  if (confidence >= 0.70) return '#ffd600'  // yellow
  return '#f44336'                           // red
}

/**
 * @param {{
 *   imageUrl: string,
 *   defects: Array<{ type: string, confidence: number, boundingBox: { x: number, y: number, width: number, height: number } }>,
 *   className?: string
 * }} props
 */
export default function DefectOverlay({ imageUrl, defects = [], className }) {
  const canvasRef    = useRef(null)
  const [ready, setReady] = useState(false)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  // ── Draw function ─────────────────────────────────────────────────────────
  const draw = useCallback((canvas, img) => {
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')

    canvas.width  = img.naturalWidth
    canvas.height = img.naturalHeight
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight })

    // Draw base image
    ctx.drawImage(img, 0, 0)

    // Draw defect boxes
    defects.forEach((defect) => {
      const { x, y, width, height } = defect.boundingBox
      const conf  = defect.confidence
      const color = confidenceColor(conf)
      const label = `${defect.type} (${Math.round(conf * 100)}%)`

      // ── Box ──────────────────────────────────────────────────────────────
      ctx.strokeStyle = color
      ctx.lineWidth   = Math.max(2, img.naturalWidth / 320)
      ctx.strokeRect(x, y, width, height)

      // ── Label background ─────────────────────────────────────────────────
      const fontSize = Math.max(12, img.naturalWidth / 60)
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
      const metrics   = ctx.measureText(label)
      const textW     = metrics.width + 8
      const textH     = fontSize + 6
      const labelY    = y > textH + 4 ? y - textH - 2 : y + 2

      ctx.fillStyle = color
      ctx.fillRect(x - 1, labelY, textW, textH)

      // ── Label text ───────────────────────────────────────────────────────
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, x + 3, labelY + fontSize)
    })

    setReady(true)
  }, [defects])

  // ── Load image and draw when imageUrl or defects change ──────────────────
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return
    setReady(false)

    const img = new Image()
    img.onload  = () => draw(canvasRef.current, img)
    img.onerror = () => setReady(false)
    img.src = imageUrl
  }, [imageUrl, draw])

  // ── Download annotated canvas ─────────────────────────────────────────────
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
      {/* ── Canvas container ────────────────────────────────────────────── */}
      <div className="canvas-container relative group">
        <canvas
          ref={canvasRef}
          id="defect-canvas"
          aria-label="Annotated inspection image with defect bounding boxes"
          className="w-full h-auto rounded-xl"
          style={{ display: imageUrl ? 'block' : 'none' }}
        />

        {/* Zoom hint overlay */}
        {ready && (
          <div className="absolute inset-0 flex items-center justify-center
            bg-black/0 group-hover:bg-black/10 transition-all duration-300
            pointer-events-none rounded-xl">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300
              flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
              <ZoomIn size={12} />
              {imgSize.w} × {imgSize.h}px · {defects.length} defect{defects.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Loading skeleton while image draws */}
        {!ready && (
          <div className="skeleton min-h-[220px] rounded-xl" />
        )}
      </div>

      {/* ── Download button ─────────────────────────────────────────────── */}
      {ready && (
        <button
          id="download-annotated-btn"
          onClick={handleDownload}
          className="btn-ghost w-full justify-center animate-slide-up"
          aria-label="Download annotated inspection image"
        >
          <Download size={16} />
          Download Annotated Image
        </button>
      )}
    </div>
  )
}
