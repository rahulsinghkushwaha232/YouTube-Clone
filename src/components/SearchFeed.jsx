import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { searchVideos } from '../lib/youtubeApi.js'
import ErrorState from './ErrorState.jsx'
import Shimmer from './Shimmer.jsx'
import VideoCard from './VideoCard.jsx'

export default function SearchFeed() {
  const { searchTerm = '' } = useParams()
  const [pagination, setPagination] = useState({ term: '', token: '' })
  const [retryCount, setRetryCount] = useState(0)
  const pageToken = pagination.term === searchTerm ? pagination.token : ''
  const [pageState, setPageState] = useState({ key: '', page: null, error: '' })
  const requestKey = `${searchTerm}\u0000${pageToken}\u0000${retryCount}`
  const loading = pageState.key !== requestKey
  const page = loading ? null : pageState.page
  const error = loading ? '' : pageState.error

  useEffect(() => {
    const controller = new AbortController()
    searchVideos({ query: searchTerm, pageToken, signal: controller.signal })
      .then((result) => setPageState({ key: requestKey, page: result, error: '' }))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setPageState({ key: requestKey, page: null, error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [pageToken, requestKey, searchTerm])

  function changePage(token) {
    setPagination({ term: searchTerm, token })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="page-section">
      <div className="search-results-heading">
        <h1 className="search-query-title">Search results for “{searchTerm}”</h1>
        <button className="filter-button">☷　Filters</button>
      </div>
      {error ? <ErrorState message={error} onRetry={() => setRetryCount((count) => count + 1)} /> : loading ? <Shimmer count={6} /> : page.items.length ? (
        <>
          <div className="video-grid">{page.items.map((video) => <VideoCard key={video.id} video={video} />)}</div>
          <div className="feed-pagination">
            <button className="text-button" disabled={!page.prevPageToken || loading} onClick={() => changePage(page.prevPageToken)}>Previous</button>
            <button className="text-button" disabled={!page.nextPageToken || loading} onClick={() => changePage(page.nextPageToken)}>Next</button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">⌕</span>
          <h1>No videos found</h1>
          <p>Try searching for something else.</p>
        </div>
      )}
    </section>
  )
}
