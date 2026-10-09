import { getAppSettings } from './appData.js'

const API_BASE = 'https://www.googleapis.com/youtube/v3'
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const CACHE_PREFIX = 'youtube-api-cache:'
const CACHE_TTL = 60 * 60 * 1000
const QUOTA_ERROR = 'Daily YouTube API quota is over. It resets around 12:30 PM IST.'
export function clearYouTubeApiCache() {
  const keys = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(CACHE_PREFIX)) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
}

export class YouTubeApiError extends Error {
  constructor(message, status, reason = '') {
    super(message)
    this.name = 'YouTubeApiError'
    this.status = status
    this.reason = reason
  }
}

async function request(endpoint, params, signal) {
  if (!API_KEY || API_KEY === 'your_key_here') {
    throw new YouTubeApiError('Add a valid VITE_YOUTUBE_API_KEY to .env and restart the dev server.')
  }

  if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError')

  const cacheParams = new URLSearchParams(params)
  const cacheUrl = `${API_BASE}/${endpoint}?${cacheParams}`
  const cacheKey = `${CACHE_PREFIX}${cacheUrl}`
  const cached = readCache(cacheKey)
  if (cached?.expiresAt > Date.now()) return cached.data

  const requestParams = new URLSearchParams({ ...params, key: API_KEY })
  const response = await fetch(`${API_BASE}/${endpoint}?${requestParams}`, { signal })
  const payload = await response.json()

  if (!response.ok) {
    if (isQuotaError(payload)) {
      if (cached) return cached.data
      throw new YouTubeApiError(QUOTA_ERROR, response.status, 'quotaExceeded')
    }
    const message = payload.error?.message ?? `YouTube API request failed (${response.status}).`
    throw new YouTubeApiError(message, response.status, payload.error?.errors?.[0]?.reason ?? '')
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
      data: payload,
    }))
  } catch {
    // API results remain usable when browser storage is unavailable or full.
  }
  return payload
}

function readCache(currentKey) {
  let current = null
  const now = Date.now()
  const keys = []
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(CACHE_PREFIX)) keys.push(key)
    }
    for (const key of keys) {
      const value = localStorage.getItem(key)
      let entry
      try {
        entry = value ? JSON.parse(value) : null
      } catch {
        localStorage.removeItem(key)
        continue
      }
      if (!entry || !Number.isFinite(entry.expiresAt) || !('data' in entry)) {
        localStorage.removeItem(key)
      } else if (entry.expiresAt <= now && key !== currentKey) {
        localStorage.removeItem(key)
      } else if (key === currentKey) {
        current = entry
      }
    }
  } catch {
    return null
  }
  return current
}

function isQuotaError(payload) {
  const errors = payload.error?.errors ?? []
  const reasons = errors.map((error) => error.reason)
  return reasons.some((reason) => /quota|dailylimit/i.test(reason ?? ''))
    || /quota[\s_-]*exceeded|daily[\s_-]*limit/i.test(payload.error?.message ?? '')
}

export function formatViews(value) {
  if (value == null || !Number.isFinite(Number(value))) return '— views'
  return `${new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value))} views`
}

export function formatDuration(value) {
  if (!value) return ''
  const match = value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return ''

  const hours = Number(match[1] ?? 0) * 24 + Number(match[2] ?? 0)
  const minutes = Number(match[3] ?? 0)
  const seconds = Number(match[4] ?? 0)
  const pad = (part) => String(part).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function formatTimeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const units = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  const [unit, size] = units.find(([, unitSeconds]) => Math.abs(seconds) >= unitSeconds) ?? ['second', 1]
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round(seconds / size), unit)
}

export function normalizeVideo(video) {
  const snippet = video.snippet ?? {}
  const thumbnail = snippet.thumbnails?.maxres
    ?? snippet.thumbnails?.high
    ?? snippet.thumbnails?.medium
    ?? snippet.thumbnails?.default

  return {
    id: typeof video.id === 'string' ? video.id : video.id?.videoId,
    title: snippet.title ?? 'Untitled video',
    channel: snippet.channelTitle ?? 'Unknown channel',
    channelId: snippet.channelId,
    description: snippet.description ?? '',
    publishedAt: snippet.publishedAt,
    views: formatViews(video.statistics?.viewCount),
    viewCount: video.statistics?.viewCount ?? '0',
    likeCount: video.statistics?.likeCount ?? '0',
    commentCount: video.statistics?.commentCount ?? '0',
    categoryId: snippet.categoryId,
    age: formatTimeAgo(snippet.publishedAt),
    duration: formatDuration(video.contentDetails?.duration),
    thumbnail: thumbnail?.url ?? `https://i.ytimg.com/vi/${typeof video.id === 'string' ? video.id : video.id?.videoId}/hqdefault.jpg`,
    avatar: (snippet.channelTitle ?? 'Y').charAt(0).toUpperCase(),
  }
}

export function formatCompactCount(value) {
  const count = Number(value)
  if (!Number.isFinite(count)) return '0'
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(count)
}

export async function getChannelSubscriberCount(channelId, { signal } = {}) {
  if (!channelId) return '0'
  const payload = await request('channels', {
    part: 'statistics',
    id: channelId,
  }, signal)
  return payload.items[0]?.statistics?.subscriberCount ?? '0'
}

export async function getVideoComments(videoId, { order = 'relevance', pageToken, signal } = {}) {
  const payload = await request('commentThreads', {
    part: 'snippet',
    videoId,
    maxResults: '20',
    order,
    ...(pageToken ? { pageToken } : {}),
  }, signal)
  return {
    items: (payload.items ?? []).map((item) => {
      const comment = item.snippet.topLevelComment
      const snippet = comment.snippet
      const text = new DOMParser().parseFromString(snippet.textDisplay ?? snippet.textOriginal ?? '', 'text/html').body.textContent ?? ''
      return {
        id: comment.id,
        author: snippet.authorDisplayName ?? 'YouTube user',
        avatar: snippet.authorProfileImageUrl ?? '',
        publishedAt: snippet.publishedAt,
        text,
        likeCount: snippet.likeCount ?? 0,
      }
    }),
    nextPageToken: payload.nextPageToken ?? '',
  }
}

export async function getPopularVideos({ pageToken, categoryId, regionCode, maxResults = 24, signal } = {}) {
  const payload = await request('videos', {
    part: 'snippet,contentDetails,statistics',
    chart: 'mostPopular',
    maxResults: String(maxResults),
    ...(categoryId ? { videoCategoryId: categoryId } : {}),
    regionCode: regionCode ?? getAppSettings().regionCode,
    ...(pageToken ? { pageToken } : {}),
  }, signal)

  return {
    items: payload.items.map(normalizeVideo),
    nextPageToken: payload.nextPageToken,
  }
}

export async function searchVideos({
  query,
  pageToken,
  relatedToVideoId,
  channelId,
  eventType,
  order,
  videoDuration,
  signal,
  maxResults = 18,
}) {
  const searchPayload = await request('search', {
    part: 'snippet',
    type: 'video',
    maxResults: String(maxResults),
    ...(query ? { q: query } : {}),
    ...(channelId ? { channelId } : {}),
    ...(pageToken ? { pageToken } : {}),
    ...(relatedToVideoId ? { relatedToVideoId } : {}),
    ...(eventType ? { eventType } : {}),
    ...(order ? { order } : {}),
    ...(videoDuration ? { videoDuration } : {}),
  }, signal)

  const ids = searchPayload.items
    .map((item) => item.id.videoId)
    .filter(Boolean)

  if (ids.length === 0) {
    return { items: [], nextPageToken: searchPayload.nextPageToken, prevPageToken: searchPayload.prevPageToken }
  }

  const detailsPayload = await request('videos', {
    part: 'snippet,contentDetails,statistics',
    id: ids.join(','),
    maxResults: String(ids.length),
  }, signal)
  const details = new Map(detailsPayload.items.map((item) => [item.id, item]))
  const items = ids.map((id) => details.get(id)).filter(Boolean).map(normalizeVideo)

  return {
    items,
    nextPageToken: searchPayload.nextPageToken,
    prevPageToken: searchPayload.prevPageToken,
  }
}

export function getLatestChannelVideos(channelId, { signal, maxResults = 6 } = {}) {
  return searchVideos({ channelId, order: 'date', signal, maxResults })
}

export function getShortVideos({ pageToken, signal } = {}) {
  return searchVideos({
    query: 'shorts',
    videoDuration: 'short',
    pageToken,
    signal,
    maxResults: 20,
  })
}

export async function getCategoryVideos(category, { pageToken, signal } = {}) {
  const popularCategoryIds = {
    Music: '10',
    Gaming: '20',
    Technology: '28',
    Mixes: '10',
    Podcasts: '22',
    Design: '26',
    'Recently uploaded': '24',
  }

  let result
  if (category === 'All' || popularCategoryIds[category]) {
    result = await getPopularVideos({
      categoryId: popularCategoryIds[category],
      regionCode: category === 'Music' ? 'IN' : category === 'Mixes' ? 'US' : undefined,
      pageToken,
      signal,
    })
  } else if (category === 'Live') {
    result = await searchVideos({ eventType: 'live', pageToken, signal, maxResults: 24 })
  } else {
    throw new Error(`Unsupported video category: ${category}`)
  }

  if (category === 'Recently uploaded') {
    result.items.sort((first, second) => Date.parse(second.publishedAt ?? '') - Date.parse(first.publishedAt ?? ''))
  }

  if (!result.items.length && !pageToken && category !== 'All') {
    return {
      ...await getPopularVideos({ signal }),
      isFallback: true,
      note: `No ${category.toLowerCase()} videos were found, so we're showing popular videos instead.`,
    }
  }

  return result
}

export async function getVideoById(id, { signal } = {}) {
  const payload = await request('videos', {
    part: 'snippet,contentDetails,statistics',
    id,
    maxResults: '1',
  }, signal)

  return payload.items[0] ? normalizeVideo(payload.items[0]) : null
}

export async function getSuggestedVideos(video, { regionCode, signal } = {}) {
  const withoutCurrentVideo = (items) => items.filter((item) => item.id !== video.id)
  if (video.categoryId) {
    try {
      const categorized = await getPopularVideos({
        categoryId: video.categoryId,
        regionCode,
        maxResults: 20,
        signal,
      })
      const items = withoutCurrentVideo(categorized.items)
      if (items.length) return items
    } catch (error) {
      if (error.name === 'AbortError') throw error
    }
  }

  const popular = await getPopularVideos({ regionCode, maxResults: 20, signal })
  return withoutCurrentVideo(popular.items)
}

export async function getChannelSuggestedVideos(video, { signal } = {}) {
  if (!video.channelId) return []
  const result = await searchVideos({ channelId: video.channelId, signal, maxResults: 20 })
  return result.items.filter((item) => item.id !== video.id)
}
