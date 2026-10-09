import { useCallback, useEffect, useRef, useState } from 'react'
import { getCategoryVideos, getPopularVideos } from './lib/youtubeApi.js'
import { useAppSettings } from './lib/appData.js'
import ErrorState from './components/ErrorState.jsx'
import Shimmer from './components/Shimmer.jsx'
import VideoCard from './components/VideoCard.jsx'

export default function App() {
  const [category, setCategory] = useState('All')
  const { regionCode } = useAppSettings()
  const [feed, setFeed] = useState({ requestId: '', videos: [], nextPageToken: '', error: '', note: '', isFallback: false })
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const inFlight = useRef(false)
  const requests = useRef(new Set())
  const sentinel = useRef(null)
  const requestId = `${category}:${regionCode}:${retryCount}`
  const loading = feed.requestId !== requestId
  const videos = loading ? [] : feed.videos
  const nextPageToken = loading ? '' : feed.nextPageToken
  const error = loading ? '' : feed.error
  const categoryLabel = category === 'All' ? 'popular' : category.toLowerCase()

  useEffect(() => {
    const controller = new AbortController()
    const activeRequests = requests.current
    activeRequests.add(controller)
    getCategoryVideos(category, { signal: controller.signal })
      .then((result) => {
        setFeed({
          requestId,
          videos: result.items,
          nextPageToken: result.nextPageToken ?? '',
          error: '',
          note: result.note ?? '',
          isFallback: result.isFallback ?? false,
        })
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setFeed({
            requestId,
            videos: [],
            nextPageToken: '',
            error: requestError.message || `We couldn't load ${categoryLabel} videos. Please try again.`,
          })
        }
      })
      .finally(() => {
        activeRequests.delete(controller)
      })

    return () => {
      activeRequests.forEach((request) => request.abort())
      activeRequests.clear()
    }
  }, [category, categoryLabel, regionCode, requestId])

  const loadMore = useCallback(async () => {
    if (!nextPageToken || inFlight.current) return
    inFlight.current = true
    setLoadingMore(true)
    setMoreError('')
    const controller = new AbortController()
    requests.current.add(controller)
    try {
      const result = feed.isFallback
        ? await getPopularVideos({ pageToken: nextPageToken, signal: controller.signal })
        : await getCategoryVideos(category, { pageToken: nextPageToken, signal: controller.signal })
      setFeed((current) => ({
        ...current,
        videos: [...current.videos, ...result.items],
        nextPageToken: result.nextPageToken ?? '',
      }))
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setMoreError(requestError.message || `More ${categoryLabel} videos couldn't be loaded. Please try again.`)
      }
    } finally {
      requests.current.delete(controller)
      inFlight.current = false
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }, [category, categoryLabel, feed.isFallback, nextPageToken])

  useEffect(() => {
    const element = sentinel.current
    if (!element || !nextPageToken || loadingMore || error || moreError || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore()
    }, { rootMargin: '500px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [error, loadMore, loadingMore, moreError, nextPageToken])

  return (
    <section className="page-section">
      <div className="category-strip" aria-label="Video categories">
        {['All', 'Music', 'Gaming', 'Live', 'Mixes', 'Technology', 'Podcasts', 'Design', 'Recently uploaded'].map((item) => (
          <button
            aria-pressed={category === item}
            className={`category-chip${category === item ? ' is-active' : ''}`}
            key={item}
            onClick={() => {
              if (category === item) return
              inFlight.current = false
              setMoreError('')
              setLoadingMore(false)
              setCategory(item)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <h1 className="sr-only">Recommended videos</h1>
      {error ? <ErrorState message={error} onRetry={() => {
        setMoreError('')
        setRetryCount((count) => count + 1)
      }} /> : (
        <>
          {!loading && feed.note && <p className="category-fallback-note" role="status">{feed.note}</p>}
          {loading ? <Shimmer count={12} /> : videos.length ? (
            <div className="video-grid">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">⌕</span>
              <h2>No {categoryLabel} videos found</h2>
              <p>Try another category or come back later.</p>
            </div>
          )}
          {loadingMore && <Shimmer count={6} />}
          {moreError && <ErrorState message={moreError} onRetry={loadMore} />}
          {nextPageToken && <div className="feed-pagination" ref={sentinel}>
            <button className="text-button" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? 'Loading…' : 'Load more videos'}
            </button>
          </div>}
        </>
      )}
    </section>
  )
}
