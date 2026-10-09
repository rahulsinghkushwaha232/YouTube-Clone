import { useCallback, useEffect, useRef, useState } from 'react'
import { getShortVideos } from '../lib/youtubeApi.js'
import ErrorState from './ErrorState.jsx'
import Shimmer from './Shimmer.jsx'
import VideoCard from './VideoCard.jsx'

export default function Shorts() {
  const [feed, setFeed] = useState({ requestId: -1, videos: [], nextPageToken: '', error: '' })
  const [retryCount, setRetryCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const inFlight = useRef(false)
  const requestId = retryCount
  const loading = feed.requestId !== requestId

  useEffect(() => {
    const controller = new AbortController()
    getShortVideos({ signal: controller.signal })
      .then((result) => setFeed({
        requestId,
        videos: result.items,
        nextPageToken: result.nextPageToken ?? '',
        error: '',
      }))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setFeed({ requestId, videos: [], nextPageToken: '', error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [requestId])

  const loadMore = useCallback(async () => {
    if (!feed.nextPageToken || inFlight.current) return
    inFlight.current = true
    setLoadingMore(true)
    setMoreError('')
    const controller = new AbortController()
    try {
      const result = await getShortVideos({ pageToken: feed.nextPageToken, signal: controller.signal })
      setFeed((current) => ({
        ...current,
        videos: [...current.videos, ...result.items],
        nextPageToken: result.nextPageToken ?? '',
      }))
    } catch (requestError) {
      if (requestError.name !== 'AbortError') setMoreError(requestError.message)
    } finally {
      inFlight.current = false
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }, [feed.nextPageToken])

  return (
    <section className="page-section">
      <h1 className="page-title">Shorts</h1>
      {loading ? <Shimmer count={12} /> : feed.error ? (
        <ErrorState message={feed.error} onRetry={() => setRetryCount((count) => count + 1)} />
      ) : feed.videos.length ? (
        <>
          <div className="video-grid">{feed.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div>
          {loadingMore && <Shimmer count={6} />}
          {moreError && <ErrorState message={moreError} onRetry={loadMore} />}
          {feed.nextPageToken && (
            <div className="feed-pagination">
              <button className="text-button" disabled={loadingMore} onClick={loadMore} type="button">
                {loadingMore ? 'Loading…' : 'Load more Shorts'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">▶</span>
          <h2>No Shorts found</h2>
          <p>Try again later to discover short videos.</p>
        </div>
      )}
    </section>
  )
}
