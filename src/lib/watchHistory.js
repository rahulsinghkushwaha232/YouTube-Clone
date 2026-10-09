import { useEffect, useState } from 'react'

const STORAGE_KEY = 'youtube-clone-watch-history'
const HISTORY_LIMIT = 50
const HISTORY_EVENT = 'youtube-clone-history-updated'

function readStoredHistory() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return { items: [], error: '' }

    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      return { items: [], error: 'Saved watch history is invalid. Clear it to start a new history.' }
    }

    const seen = new Set()
    const items = parsed.filter((video) => {
      if (!video || typeof video.id !== 'string' || typeof video.title !== 'string' || seen.has(video.id)) return false
      seen.add(video.id)
      return true
    }).slice(0, HISTORY_LIMIT)
    return { items, error: '' }
  } catch {
    return { items: [], error: 'Watch history could not be read from local storage.' }
  }
}

function writeStoredHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)))
    window.dispatchEvent(new Event(HISTORY_EVENT))
    return ''
  } catch {
    return 'Watch history could not be saved. Check your browser storage settings.'
  }
}

export function saveWatchedVideo(video) {
  const history = readStoredHistory()
  if (history.error) return history.error

  const entry = { ...video, watchedAt: new Date().toISOString() }
  const items = [entry, ...history.items.filter((item) => item.id !== video.id)]
  return writeStoredHistory(items)
}

export function clearWatchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('watchHistory')
    window.dispatchEvent(new Event(HISTORY_EVENT))
    return ''
  } catch {
    return 'Watch history could not be cleared. Check your browser storage settings.'
  }
}

export function useWatchHistory() {
  const [history, setHistory] = useState(readStoredHistory)

  useEffect(() => {
    function updateHistory() {
      setHistory(readStoredHistory())
    }

    window.addEventListener(HISTORY_EVENT, updateHistory)
    window.addEventListener('storage', updateHistory)
    return () => {
      window.removeEventListener(HISTORY_EVENT, updateHistory)
      window.removeEventListener('storage', updateHistory)
    }
  }, [])

  return {
    ...history,
    clear: clearWatchHistory,
  }
}
