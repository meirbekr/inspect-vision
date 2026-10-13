/**
 * src/utils/demoSamples.js
 * ────────────────────────
 * Generates synthetic manufacturing sample images on-the-fly as standard File objects.
 * Enables zero-setup, one-click testing of clean parts and defect cases.
 */

function canvasToFile(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], filename, { type: 'image/jpeg' })
      resolve(file)
    }, 'image/jpeg', 0.92)
  })
}

/**
 * 1. Clean metal surface (no defects).
 */
export async function createCleanSampleFile() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 640
  const ctx = canvas.getContext('2d')

  // Smooth brushed metal gradient
  const grad = ctx.createLinearGradient(0, 0, 640, 640)
  grad.addColorStop(0, '#94a3b8')
  grad.addColorStop(0.5, '#cbd5e1')
  grad.addColorStop(1, '#94a3b8')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 640, 640)

  // Brushed grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  for (let i = 0; i < 640; i += 3) {
    ctx.fillRect(0, i, 640, 1)
  }

  // Soft metallic highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.fillRect(160, 0, 140, 640)

  return canvasToFile(canvas, 'sample_clean_plate.jpg')
}

/**
 * 2. Metal sample with scratch and dent defects.
 */
export async function createDefectiveSampleFile() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 640
  const ctx = canvas.getContext('2d')

  // Dark steel surface
  const grad = ctx.createLinearGradient(0, 0, 640, 640)
  grad.addColorStop(0, '#64748b')
  grad.addColorStop(0.5, '#475569')
  grad.addColorStop(1, '#334155')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 640, 640)

  // Draw scratches
  ctx.strokeStyle = '#f1f5f9'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(120, 85)
  ctx.bezierCurveTo(135, 95, 145, 105, 165, 115)
  ctx.stroke()

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(125, 90)
  ctx.lineTo(155, 110)
  ctx.stroke()

  // Draw dent (dark center with light rim)
  const dentGrad = ctx.createRadialGradient(325, 225, 8, 330, 230, 32)
  dentGrad.addColorStop(0, '#1e293b')
  dentGrad.addColorStop(0.7, '#334155')
  dentGrad.addColorStop(1, '#94a3b8')
  ctx.fillStyle = dentGrad
  ctx.beginPath()
  ctx.arc(330, 225, 30, 0, 2 * Math.PI)
  ctx.fill()

  return canvasToFile(canvas, 'sample_steel_defects.jpg')
}

/**
 * 3. Concrete surface with visible crack.
 */
export async function createCrackSampleFile() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 640
  const ctx = canvas.getContext('2d')

  // Rough concrete base
  ctx.fillStyle = '#78716c'
  ctx.fillRect(0, 0, 640, 640)

  // Noise dots
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 640
    const y = Math.random() * 640
    const shade = Math.random() > 0.5 ? '#57534e' : '#a8a29e'
    ctx.fillStyle = shade
    ctx.fillRect(x, y, 2, 2)
  }

  // Jagged structural crack
  ctx.strokeStyle = '#1c1917'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(150, 60)
  ctx.lineTo(190, 140)
  ctx.lineTo(210, 230)
  ctx.lineTo(250, 310)
  ctx.lineTo(280, 430)
  ctx.lineTo(340, 560)
  ctx.stroke()

  // Branch
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(210, 230)
  ctx.lineTo(270, 280)
  ctx.lineTo(310, 320)
  ctx.stroke()

  return canvasToFile(canvas, 'sample_concrete_crack.jpg')
}
