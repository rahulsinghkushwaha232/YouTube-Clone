import { useEffect, useState } from 'react'

const UPDATE_EVENT = 'youtube-clone-video-library-updated'

function readList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((video) => video && typeof video.id === 'string') : []
  } catch {
    return []
  }
}

function writeList(key, items) {
  localStorage.setItem(key, JSON.stringify(items))
  window.dispatchEvent(new Event(UPDATE_EVENT))
}

export function getWatchLater() {
  return readList('watchLater')
}

export function getLikedVideos() {
  return readList('liked')
}

export function toggleWatchLater(video) {
  const videos = getWatchLater()
  const exists = videos.some((item) => item.id === video.id)
  writeList('watchLater', exists ? videos.filter((item) => item.id !== video.id) : [video, ...videos])
  return !exists
}

export function toggleLikedVideo(video) {
  const videos = getLikedVideos()
  const exists = videos.some((item) => item.id === video.id)
  writeList('liked', exists ? videos.filter((item) => item.id !== video.id) : [video, ...videos])
  return !exists
}

export function useVideoLibrary() {
  const [videos, setVideos] = useState(() => ({
    watchLater: getWatchLater(),
    liked: getLikedVideos(),
  }))

  useEffect(() => {
    const update = () => setVideos({ watchLater: getWatchLater(), liked: getLikedVideos() })
    window.addEventListener(UPDATE_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(UPDATE_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return videos
}
