import { useEffect, useState } from 'react'

const SETTINGS_KEY = 'settings'
const REPORTS_KEY = 'reports'
const FEEDBACK_KEY = 'feedback'
const SETTINGS_EVENT = 'youtube-clone-settings-updated'
const DEFAULT_SETTINGS = { autoplay: true, autoplayNext: false, theaterMode: false, regionCode: 'IN' }
const REGION_CODES = ['IN', 'US', 'GB', 'CA', 'AU']

export function getAppSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return {
      autoplay: typeof stored.autoplay === 'boolean' ? stored.autoplay : DEFAULT_SETTINGS.autoplay,
      autoplayNext: typeof stored.autoplayNext === 'boolean' ? stored.autoplayNext : DEFAULT_SETTINGS.autoplayNext,
      theaterMode: typeof stored.theaterMode === 'boolean' ? stored.theaterMode : DEFAULT_SETTINGS.theaterMode,
      regionCode: REGION_CODES.includes(stored.regionCode) ? stored.regionCode : DEFAULT_SETTINGS.regionCode,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveAppSettings(updates) {
  const settings = { ...getAppSettings(), ...updates }
  if (
    typeof settings.autoplay !== 'boolean'
    || typeof settings.autoplayNext !== 'boolean'
    || typeof settings.theaterMode !== 'boolean'
    || !REGION_CODES.includes(settings.regionCode)
  ) {
    throw new Error('Invalid settings value.')
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  window.dispatchEvent(new Event(SETTINGS_EVENT))
  return settings
}

export function useAppSettings() {
  const [settings, setSettings] = useState(getAppSettings)

  useEffect(() => {
    const update = () => setSettings(getAppSettings())
    window.addEventListener(SETTINGS_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(SETTINGS_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return settings
}

export function getReports() {
  try {
    const reports = JSON.parse(localStorage.getItem(REPORTS_KEY) ?? '[]')
    return Array.isArray(reports) ? reports.filter((report) => (
      report
      && typeof report.videoId === 'string'
      && typeof report.title === 'string'
      && typeof report.reason === 'string'
      && typeof report.date === 'string'
    )).slice(0, 50) : []
  } catch {
    return []
  }
}

export function saveVideoReport(report) {
  const reports = [report, ...getReports()]
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(0, 50)))
}

export function saveFeedback(feedback) {
  let entries
  try {
    const stored = JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? '[]')
    entries = Array.isArray(stored) ? stored : []
  } catch {
    entries = []
  }
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify([{ ...feedback, date: new Date().toISOString() }, ...entries]))
}
