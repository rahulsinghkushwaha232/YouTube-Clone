import { useState } from 'react'
import ErrorState from './ErrorState.jsx'
import VideoCard from './VideoCard.jsx'
import { useWatchHistory } from '../lib/watchHistory.js'

export default function History() {
  const { items, error, clear } = useWatchHistory()
  const [actionError, setActionError] = useState('')

  function clearHistory() {
    setActionError(clear())
  }

  return (
    <section className="page-section">
      <div className="history-page-heading">
        <h1 className="page-title">Watch history</h1>
        <button
          className="clear-history-button"
          disabled={items.length === 0 && !error && !actionError}
          onClick={clearHistory}
        >Clear History</button>
      </div>
      {(error || actionError) ? <ErrorState message={error || actionError} onRetry={clearHistory} /> : items.length > 0 ? (
        <div className="video-grid history-video-grid">
          {items.map((video) => <VideoCard key={video.id} video={video} />)}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">◷</span>
          <h2>Your watch history is empty</h2>
          <p>Videos you watch will appear here on this device.</p>
        </div>
      )}
    </section>
  )
}
