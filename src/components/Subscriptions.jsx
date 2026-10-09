import { useEffect, useState } from 'react'
import { getLatestChannelVideos } from '../lib/youtubeApi.js'
import { removeSubscription, useSubscriptions } from '../lib/subscriptions.js'
import { showAppToast } from '../lib/appToast.js'
import ErrorState from './ErrorState.jsx'
import Shimmer from './Shimmer.jsx'
import VideoCard from './VideoCard.jsx'

export default function Subscriptions() {
  const subscriptions = useSubscriptions()
  const [feedState, setFeedState] = useState({ key: '', videos: [], error: '' })
  const key = subscriptions.map((channel) => channel.channelId).join('|')
  const loading = Boolean(key) && feedState.key !== key
  const videos = loading ? [] : feedState.videos
  const error = loading ? '' : feedState.error

  useEffect(() => {
    if (!key) return undefined
    const controller = new AbortController()
    const channels = subscriptions.slice(0, 5)
    Promise.all(channels.map((channel) => getLatestChannelVideos(channel.channelId, {
      signal: controller.signal,
      maxResults: 6,
    })))
      .then((results) => {
        const latest = results.flatMap((result) => result.items)
        const uniqueVideos = [...new Map(latest.map((video) => [video.id, video])).values()]
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        setFeedState({ key, videos: uniqueVideos, error: '' })
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setFeedState({ key, videos: [], error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [key, subscriptions])

  function unsubscribe(channel) {
    if (!removeSubscription(channel.channelId)) {
      showAppToast('Subscription could not be removed')
      return
    }
    showAppToast('Unsubscribed')
  }

  return (
    <section className="page-section">
      <h1 className="page-title">Subscriptions</h1>
      {subscriptions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">◉</span>
          <h2>No subscriptions yet.</h2>
          <p>Subscribe to channels from the watch page.</p>
        </div>
      ) : (
        <>
          <div className="subscribed-channel-list">
            {subscriptions.map((channel) => (
              <div className="subscribed-channel-row" key={channel.channelId}>
                <span className="channel-avatar-circle channel-blue">{channel.channelTitle.charAt(0).toUpperCase()}</span>
                <strong>{channel.channelTitle}</strong>
                <button className="subscribed-remove-button" onClick={() => unsubscribe(channel)} type="button">Unsubscribe</button>
              </div>
            ))}
          </div>
          <h2 className="section-title">Latest videos</h2>
          {error ? <ErrorState message={error} /> : loading ? <Shimmer count={12} /> : videos.length ? (
            <div className="video-grid">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div>
          ) : (
            <div className="empty-state">
              <h2>No recent videos found</h2>
              <p>Your subscribed channels have no recent public uploads.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
