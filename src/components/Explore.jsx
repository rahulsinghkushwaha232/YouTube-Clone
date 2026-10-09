import { useEffect, useState } from 'react'
import { getPopularVideos } from '../lib/youtubeApi.js'
import ErrorState from './ErrorState.jsx'
import Shimmer from './Shimmer.jsx'
import VideoCard from './VideoCard.jsx'

const categories = [
  ['♬', 'Music', 'category-music'],
  ['◉', 'Gaming', 'category-gaming'],
  ['▣', 'News', 'category-news'],
  ['⚽', 'Sports', 'category-sports'],
]

export default function Explore() {
  const [feed, setFeed] = useState({ requestId: -1, videos: [], error: '' })
  const [retryCount, setRetryCount] = useState(0)
  const loading = feed.requestId !== retryCount
  const error = loading ? '' : feed.error

  useEffect(() => {
    const controller = new AbortController()
    getPopularVideos({ signal: controller.signal })
      .then((result) => setFeed({ requestId: retryCount, videos: result.items, error: '' }))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setFeed({ requestId: retryCount, videos: [], error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [retryCount])

  return (
    <section className="page-section">
      <h1 className="page-title">Explore</h1>
      <div className="explore-categories">
        {categories.map(([icon, label, color]) => (
          <button className={`explore-category ${color}`} key={label}><span>{icon}</span>{label}</button>
        ))}
      </div>
      <h2 className="section-title">Popular videos</h2>
      {error ? <ErrorState message={error} onRetry={() => setRetryCount((count) => count + 1)} /> : loading ? <Shimmer count={8} /> : (
        <div className="video-grid">{feed.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div>
      )}
    </section>
  )
}
