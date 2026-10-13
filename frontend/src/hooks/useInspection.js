/**
 * src/hooks/useInspection.js
 * ──────────────────────────
 * Custom React hook encapsulating all inspection workflow state and actions.
 *
 * Provides:
 *  - currentInspection  — The latest inspection result
 *  - historyList        — All fetched historical records
 *  - loading            — True while an async operation is in-flight
 *  - error              — Current error message or null
 *  - filters            — Active filter state for history queries
 *
 * Actions:
 *  - submitInspection(file)   — Upload image and run defect detection
 *  - loadHistory()            — Reload history (respects current filters)
 *  - applyFilters(newFilters) — Update filters and reload history
 *  - removeInspection(id)     — Delete one record then reload
 *  - wipeHistory()            — Clear all records then reload
 *  - downloadCsv()            — Trigger CSV export download
 *  - resetCurrent()           — Clear the current inspection (new inspection flow)
 *  - clearError()             — Dismiss the current error message
 */

import { useCallback, useReducer } from 'react'
import {
  clearHistory,
  deleteInspection,
  exportHistoryCsv,
  getHistory,
  inspectImage,
} from '../utils/apiClient'
import {
  playInspectionPassedSound,
  playInspectionFailedSound,
} from '../utils/soundEffects'

// ── State shape ───────────────────────────────────────────────────────────────
const initialState = {
  currentInspection: null,
  historyList: [],
  loading: false,
  error: null,
  filters: {
    startDate: '',
    endDate: '',
    defectType: '',
  },
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null }

    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'SET_CURRENT_INSPECTION':
      return { ...state, currentInspection: action.payload, loading: false, error: null }

    case 'RESET_CURRENT':
      return { ...state, currentInspection: null, error: null }

    case 'SET_HISTORY':
      return { ...state, historyList: action.payload, loading: false }

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }

    default:
      return state
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useInspection() {
  const [state, dispatch] = useReducer(reducer, initialState)

  // ── Submit image for inspection ────────────────────────────────────────────
  const submitInspection = useCallback(async (file) => {
    // Client-side pre-validation (mirrors apiClient but catches early)
    const allowed = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) {
      dispatch({ type: 'SET_ERROR', payload: 'Unsupported file type. Please upload a JPG or PNG image.' })
      return null
    }
    if (file.size > 10 * 1024 * 1024) {
      dispatch({ type: 'SET_ERROR', payload: 'File size exceeds 10MB limit. Please use a smaller image.' })
      return null
    }

    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const result = await inspectImage(file)
      dispatch({ type: 'SET_CURRENT_INSPECTION', payload: result })
      if (result.status === 'passed') {
        playInspectionPassedSound()
      } else {
        playInspectionFailedSound()
      }
      return result
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return null
    }
  }, [])

  // ── Load inspection history ────────────────────────────────────────────────
  const loadHistory = useCallback(async (overrideFilters) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    const activeFilters = overrideFilters ?? state.filters
    try {
      const data = await getHistory({
        startDate:  activeFilters.startDate  || undefined,
        endDate:    activeFilters.endDate    || undefined,
        defectType: activeFilters.defectType || undefined,
      })
      dispatch({ type: 'SET_HISTORY', payload: data })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }, [state.filters])

  // ── Apply filters and reload ───────────────────────────────────────────────
  const applyFilters = useCallback(async (newFilters) => {
    const merged = { ...state.filters, ...newFilters }
    dispatch({ type: 'SET_FILTERS', payload: newFilters })
    await loadHistory(merged)
  }, [state.filters, loadHistory])

  // ── Delete a single inspection ─────────────────────────────────────────────
  const removeInspection = useCallback(async (id) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      await deleteInspection(id)
      await loadHistory()
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }, [loadHistory])

  // ── Clear all history ──────────────────────────────────────────────────────
  const wipeHistory = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      await clearHistory()
      dispatch({ type: 'SET_HISTORY', payload: [] })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }, [])

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const downloadCsv = useCallback(async () => {
    try {
      await exportHistoryCsv({
        startDate:  state.filters.startDate  || undefined,
        endDate:    state.filters.endDate    || undefined,
        defectType: state.filters.defectType || undefined,
      })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
    }
  }, [state.filters])

  // ── Reset current inspection ───────────────────────────────────────────────
  const resetCurrent = useCallback(() => {
    dispatch({ type: 'RESET_CURRENT' })
  }, [])

  // ── Clear error ────────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  return {
    // State
    currentInspection: state.currentInspection,
    historyList:       state.historyList,
    loading:           state.loading,
    error:             state.error,
    filters:           state.filters,
    // Actions
    submitInspection,
    loadHistory,
    applyFilters,
    removeInspection,
    wipeHistory,
    downloadCsv,
    resetCurrent,
    clearError,
  }
}
