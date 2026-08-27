/**
 * src/utils/apiClient.js
 * ──────────────────────
 * Centralised HTTP client for the Inspect-Vision FastAPI backend.
 *
 * All methods bubble up structured error messages so UI components can
 * display the exact strings returned by the backend (or sensible defaults).
 */

import axios from 'axios'

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',          // proxied by Vite → http://localhost:8000/api
  timeout: 60_000,          // 60-second timeout for large image uploads
})

/**
 * Extract a human-readable error message from an Axios error.
 * Prefers the backend's `detail` field, then falls back to the HTTP status text.
 *
 * @param {unknown} error - The thrown error object
 * @returns {string}
 */
function extractError(error) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (detail) return typeof detail === 'string' ? detail : JSON.stringify(detail)
    if (error.response?.statusText) return error.response.statusText
    if (error.code === 'ECONNABORTED') return 'Request timed out. The server may be unavailable.'
    if (error.message) return error.message
  }
  return 'An unexpected error occurred.'
}

// ── API methods ───────────────────────────────────────────────────────────────

/**
 * Submit a product image for defect detection.
 *
 * @param {File} file - The image file (JPG/PNG, ≤ 10 MB)
 * @returns {Promise<import('../types').InspectionResult>}
 * @throws {Error} With the backend's error message as the `message` property
 */
export async function inspectImage(file) {
  // ── Client-side pre-validation ────────────────────────────────────────────
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file type')
  }
  const maxBytes = 10 * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error('File size exceeds 10MB limit')
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const { data } = await api.post('/inspect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  } catch (error) {
    throw new Error(extractError(error))
  }
}

/**
 * Fetch the inspection history with optional filters.
 *
 * @param {{ startDate?: string, endDate?: string, defectType?: string }} [filters]
 * @returns {Promise<import('../types').InspectionSummary[]>}
 */
export async function getHistory(filters = {}) {
  const params = {}
  if (filters.startDate)  params.start_date   = filters.startDate
  if (filters.endDate)    params.end_date     = filters.endDate
  if (filters.defectType) params.defect_type  = filters.defectType

  try {
    const { data } = await api.get('/history', { params })
    return data
  } catch (error) {
    throw new Error(extractError(error))
  }
}

/**
 * Fetch a single inspection record by ID (includes full Base64 image URL).
 *
 * @param {string} id - Inspection ID (e.g. "insp_20250113_001")
 * @returns {Promise<import('../types').InspectionResult>}
 */
export async function getInspectionById(id) {
  try {
    const { data } = await api.get(`/history/${id}`)
    return data
  } catch (error) {
    throw new Error(extractError(error))
  }
}

/**
 * Delete a single inspection by ID.
 *
 * @param {string} id - Inspection ID to delete
 * @returns {Promise<{ message: string }>}
 */
export async function deleteInspection(id) {
  try {
    const { data } = await api.delete(`/history/${id}`)
    return data
  } catch (error) {
    throw new Error(extractError(error))
  }
}

/**
 * Clear all inspection records from the backend store.
 *
 * @returns {Promise<{ message: string }>}
 */
export async function clearHistory() {
  try {
    const { data } = await api.post('/history/clear')
    return data
  } catch (error) {
    throw new Error(extractError(error))
  }
}

/**
 * Trigger a browser download of the inspection history as a CSV file.
 * Uses the native `<a>` trick so the browser handles the file save dialog.
 *
 * @param {{ startDate?: string, endDate?: string, defectType?: string }} [filters]
 * @returns {Promise<void>}
 */
export async function exportHistoryCsv(filters = {}) {
  const params = new URLSearchParams()
  if (filters.startDate)  params.append('start_date',  filters.startDate)
  if (filters.endDate)    params.append('end_date',    filters.endDate)
  if (filters.defectType) params.append('defect_type', filters.defectType)

  try {
    const response = await api.get('/export', {
      params,
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `inspect_vision_history_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    throw new Error(extractError(error))
  }
}

export default api
