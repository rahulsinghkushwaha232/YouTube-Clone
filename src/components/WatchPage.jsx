import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  formatCompactCount,
  formatTimeAgo,
  getChannelSubscriberCount,
  getChannelSuggestedVideos,
  getSuggestedVideos,
  getVideoById,
  getVideoComments,
} from '../lib/youtubeApi.js'
import { saveWatchedVideo } from '../lib/watchHistory.js'
import { addSubscription, removeSubscription, useSubscriptions } from '../lib/subscriptions.js'
import { showAppToast } from '../lib/appToast.js'
import { saveVideoReport, saveAppSettings, useAppSettings } from '../lib/appData.js'
import { getLikedVideos, getWatchLater, toggleLikedVideo, toggleWatchLater } from '../lib/videoLibrary.js'
import ErrorState from './ErrorState.jsx'
import Modal from './Modal.jsx'
import SuggestedVideo from './SuggestedVideo.jsx'

const YOUTUBE_IFRAME_API = 'https://www.youtube.com/iframe_api'
let iframeApiPromise

function loadIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (iframeApiPromise) return iframeApiPromise

  iframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    const script = document.querySelector(`script[src="${YOUTUBE_IFRAME_API}"]`)
    const timer = window.setTimeout(() => reject(new Error('YouTube player controls could not be loaded.')), 15000)
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady()
      window.clearTimeout(timer)
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube player controls could not be loaded.'))
    }
    if (!script) {
      const newScript = document.createElement('script')
      newScript.src = YOUTUBE_IFRAME_API
      newScript.async = true
      newScript.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error('YouTube player controls could not be loaded.'))
      }
      document.head.appendChild(newScript)
    }
  }).catch((error) => {
    iframeApiPromise = null
    throw error
  })

  return iframeApiPromise
}

function Icon({ name }) {
  const paths = {
    autoplay: <><path d="M4 7h12a4 4 0 0 1 4 4v1" /><path d="m17 9 3 3 3-3M20 17H8a4 4 0 0 1-4-4v-1" /><path d="m7 15-3-3-3 3" /></>,
    theater: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14m10-14v14" /></>,
    pip: <><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="12" y="11" width="7" height="5" rx="1" /></>,
    captions: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h4m-4 4h3m4-4h3m-3 4h4" /></>,
    like: <path d="M7 10v10H4V10zm0 9h10.2a2 2 0 0 0 1.9-1.4l1.5-5A2 2 0 0 0 18.7 10H14l.7-3.3A2.2 2.2 0 0 0 12.5 4L7 10z" />,
    dislike: <path d="M17 14V4h3v10zm0-9H6.8a2 2 0 0 0-1.9 1.4l-1.5 5A2 2 0 0 0 5.3 14H10l-.7 3.3a2.2 2.2 0 0 0 2.2 2.7l5.5-6z" />,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4" /></>,
    save: <><path d="M5 4h14v17l-7-4-7 4z" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
  }
  return <svg className="watch-svg" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function DescriptionText({ text }) {
  const parts = text.split(/(https?:\/\/[^\s]+|#[\w]+)/g).filter(Boolean)
  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return <a href={part} key={`${part}-${index}`} rel="noopener noreferrer" target="_blank">{part}</a>
    }
    if (/^#[\w]+/.test(part)) {
      return <a href={`/search/${encodeURIComponent(part.slice(1))}`} key={`${part}-${index}`}>{part}</a>
    }
    return part
  })
}

function formatSuggestedError(error) {
  if (error.reason === 'quotaExceeded' || /quota[\s_-]*exceeded|daily[\s_-]*limit/i.test(error.message)) {
    return 'Search quota is over for today. Suggested videos are shown from trending instead.'
  }
  return `Couldn't load videos from this channel. ${error.message}`
}

export default function WatchPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const subscriptions = useSubscriptions()
  const settings = useAppSettings()
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportReason, setReportReason] = useState('Spam')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [descriptionState, setDescriptionState] = useState({ id: '', expanded: false })
  const [videoState, setVideoState] = useState({ key: '', video: null, error: '' })
  const [suggestionState, setSuggestionState] = useState({ key: '', videos: [], error: '' })
  const [suggestionSelection, setSuggestionSelection] = useState({ id: '', filter: 'all', retry: 0 })
  const [subscriberState, setSubscriberState] = useState({ channelId: '', count: '', error: '' })
  const [commentOrder, setCommentOrder] = useState('relevance')
  const [commentsRetry, setCommentsRetry] = useState(0)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [commentState, setCommentState] = useState({ key: '', items: [], nextPageToken: '', error: '', disabled: false })
  const [localCommentState, setLocalCommentState] = useState({ id: '', items: [] })
  const [commentDraft, setCommentDraft] = useState({ id: '', text: '' })
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copyError, setCopyError] = useState('')
  const playerRef = useRef(null)
  const playerVideoIdRef = useRef('')
  const playerSettingsRef = useRef(settings)
  const suggestionsRef = useRef([])
  const trendingSuggestionsRef = useRef([])
  const suggestionFilter = suggestionSelection.id === id ? suggestionSelection.filter : 'all'
  const suggestionRetry = suggestionSelection.id === id ? suggestionSelection.retry : 0
  const requestKey = `${id}:${retryCount}`
  const suggestionKey = `${requestKey}:${settings.regionCode}:${suggestionFilter}:${suggestionRetry}`
  const loading = videoState.key !== requestKey
  const video = loading ? null : videoState.video
  const error = loading ? '' : videoState.error
  const suggestionsLoading = loading || Boolean(video && suggestionState.key !== suggestionKey)
  const suggestions = suggestionsLoading ? [] : suggestionState.videos
  const localComments = localCommentState.id === id ? localCommentState.items : []
  const commentText = commentDraft.id === id ? commentDraft.text : ''
  const descriptionExpanded = descriptionState.id === video?.id && descriptionState.expanded
  const suggestionsError = suggestionsLoading ? '' : suggestionState.error
  const subscribed = Boolean(video?.channelId && subscriptions.some((item) => item.channelId === video.channelId))
  const commentKey = `${id}:${commentOrder}:${commentsRetry}`
  const commentsLoading = commentState.key !== commentKey
  const comments = commentsLoading ? [] : commentState.items
  const commentsError = commentsLoading ? '' : commentState.error
  const commentsDisabled = !commentsLoading && commentState.disabled
  const nextCommentToken = commentsLoading ? '' : commentState.nextPageToken
  const likedBaseCount = Number(video?.likeCount ?? 0)
  const displayedLikeCount = likedBaseCount + (liked ? 1 : 0)

  useEffect(() => {
    playerSettingsRef.current = settings
  }, [settings])

  useEffect(() => {
    suggestionsRef.current = []
    trendingSuggestionsRef.current = []
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    getVideoById(id, { signal: controller.signal })
      .then((result) => {
        if (!result) throw new Error('This video could not be found or is unavailable.')
        const historyError = saveWatchedVideo(result)
        setVideoState({ key: requestKey, video: result, error: '', historyError })
        setLiked(getLikedVideos().some((item) => item.id === result.id))
        setDisliked(false)
        setSaved(getWatchLater().some((item) => item.id === result.id))
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setVideoState({ key: requestKey, video: null, error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [id, requestKey])

  useEffect(() => {
    if (!video) return undefined
    const controller = new AbortController()
    const loadSuggestions = suggestionFilter === 'all'
      ? getSuggestedVideos(video, { regionCode: settings.regionCode, signal: controller.signal })
      : getChannelSuggestedVideos(video, { signal: controller.signal })
    loadSuggestions
      .then((videos) => {
        if (suggestionFilter === 'all') trendingSuggestionsRef.current = videos
        suggestionsRef.current = videos
        setSuggestionState({ key: suggestionKey, videos, error: '' })
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return
        if (suggestionFilter === 'channel') {
          const fallbackVideos = trendingSuggestionsRef.current
          suggestionsRef.current = fallbackVideos
          setSuggestionState({
            key: suggestionKey,
            videos: fallbackVideos,
            error: formatSuggestedError(requestError),
          })
        } else {
          suggestionsRef.current = []
          trendingSuggestionsRef.current = []
          setSuggestionState({ key: suggestionKey, videos: [], error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [video, loading, suggestionFilter, suggestionKey, settings.regionCode])

  useEffect(() => {
    if (suggestionState.key === suggestionKey) suggestionsRef.current = suggestionState.videos
  }, [suggestionKey, suggestionState])

  useEffect(() => {
    if (!video?.channelId) return undefined
    const controller = new AbortController()
    getChannelSubscriberCount(video.channelId, { signal: controller.signal })
      .then((count) => setSubscriberState({ channelId: video.channelId, count, error: '' }))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setSubscriberState({ channelId: video.channelId, count: '', error: requestError.message })
        }
      })
    return () => controller.abort()
  }, [video?.channelId])

  useEffect(() => {
    if (!video?.id || !settings.autoplayNext || playerRef.current) return undefined
    let active = true
    loadIframeApi().then((youtube) => {
      if (!active) return
      playerRef.current = new youtube.Player(`youtube-player-${video.id}`, {
        events: {
          onStateChange: (event) => {
            if (event.data === 0 && playerSettingsRef.current.autoplayNext) {
              const nextVideo = suggestionsRef.current[0]
              if (nextVideo) navigate(`/watch/${nextVideo.id}`)
            }
          },
        },
      })
      playerVideoIdRef.current = video.id
    }).catch((apiError) => {
      if (active && playerSettingsRef.current.autoplayNext) showAppToast(apiError.message)
    })
    return () => {
      active = false
    }
  }, [video?.id, settings.autoplayNext, navigate])

  useEffect(() => () => {
    playerRef.current?.destroy()
    playerRef.current = null
    playerVideoIdRef.current = ''
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    getVideoComments(id, { order: commentOrder, signal: controller.signal })
      .then((result) => setCommentState({
        key: commentKey,
        items: result.items,
        nextPageToken: result.nextPageToken,
        error: '',
        disabled: false,
      }))
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return
        const disabled = requestError.reason === 'commentsDisabled'
        setCommentState({
          key: commentKey,
          items: [],
          nextPageToken: '',
          error: disabled ? '' : requestError.message,
          disabled,
        })
      })
    return () => controller.abort()
  }, [id, commentKey, commentOrder, commentsRetry])

  useEffect(() => {
    function closeMenu(event) {
      if (!event.target.closest?.('.watch-more-menu')) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [])

  function toggleSubscription() {
    if (!video?.channelId) {
      showAppToast('This channel cannot be subscribed to right now')
      return
    }
    const success = subscribed
      ? removeSubscription(video.channelId)
      : addSubscription({ channelId: video.channelId, channelTitle: video.channel })
    if (!success) {
      showAppToast('Subscription could not be saved')
      return
    }
    showAppToast(subscribed ? 'Unsubscribed' : `Subscribed to ${video.channel}`)
  }

  function updateSetting(key, value) {
    try {
      saveAppSettings({ [key]: value })
    } catch (settingsError) {
      showAppToast(settingsError.message || 'Setting could not be saved')
    }
  }

  function toggleLike() {
    if (!video) return
    try {
      const nextLiked = toggleLikedVideo(video)
      setLiked(nextLiked)
      if (nextLiked) setDisliked(false)
    } catch (storageError) {
      showAppToast(storageError.message || 'Like could not be saved')
    }
  }

  function toggleDislike() {
    setDisliked((value) => {
      if (liked) return true
      return !value
    })
    if (liked) {
      try {
        toggleLikedVideo(video)
        setLiked(false)
      } catch (storageError) {
        showAppToast(storageError.message || 'Like could not be removed')
      }
    }
  }

  function toggleSave() {
    if (!video) return
    try {
      const isSaved = toggleWatchLater(video)
      setSaved(isSaved)
      showAppToast(isSaved ? 'Saved to Watch later' : 'Removed from Watch later')
    } catch (storageError) {
      showAppToast(storageError.message || 'Watch later could not be updated')
    }
  }

  function shareVideo() {
    setCopyError('')
    setShareDialogOpen(true)
  }

  async function shareNatively() {
    if (navigator.share) {
      try {
        await navigator.share({ title: video?.title, url: window.location.href })
        setShareDialogOpen(false)
      } catch (shareError) {
        if (shareError.name !== 'AbortError') showAppToast('Could not share this video')
      }
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareDialogOpen(false)
      showAppToast('Link copied')
    } catch {
      setCopyError('Could not copy the link. Select and copy it manually.')
    }
  }

  const loadMoreComments = useCallback(async () => {
    if (!nextCommentToken || loadingMoreComments) return
    setLoadingMoreComments(true)
    try {
      const result = await getVideoComments(id, { order: commentOrder, pageToken: nextCommentToken })
      setCommentState((current) => ({
        ...current,
        items: [...current.items, ...result.items],
        nextPageToken: result.nextPageToken,
      }))
    } catch (requestError) {
      showAppToast(requestError.message || 'More comments could not be loaded')
    } finally {
      setLoadingMoreComments(false)
    }
  }, [commentOrder, id, loadingMoreComments, nextCommentToken])

  function addLocalComment(event) {
    event.preventDefault()
    const text = commentText.trim()
    if (!text) return
    setLocalCommentState((current) => ({
      id,
      items: [{
        id: `local-${Date.now()}`,
        author: 'You',
        avatar: '',
        publishedAt: new Date().toISOString(),
        text,
        likeCount: 0,
        local: true,
      }, ...(current.id === id ? current.items : [])],
    }))
    setCommentDraft({ id, text: '' })
    showAppToast('Comment added locally')
  }

  function submitReport(event) {
    event.preventDefault()
    if (!video) return
    try {
      saveVideoReport({
        videoId: video.id,
        title: video.title,
        reason: reportReason,
        date: new Date().toISOString(),
      })
      setReportDialogOpen(false)
      showAppToast('Report submitted')
    } catch (reportError) {
      showAppToast(reportError.message || 'Report could not be saved')
    }
  }

  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=${settings.autoplay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
  const historyError = loading ? '' : videoState.historyError
  const subscriberCount = subscriberState.channelId === video?.channelId ? subscriberState.count : ''
  const commentsCount = Number(video?.commentCount ?? 0)

  return (
    <section className={`watch-layout${settings.theaterMode ? ' is-theater' : ''}`}>
      <div className="watch-primary">
        <div className="player-frame">
          <iframe
            id={video ? `youtube-player-${video.id}` : `youtube-player-${id}`}
            src={embedUrl}
            title={video?.title ?? 'YouTube video player'}
            allow="autoplay; fullscreen; picture-in-picture; accelerometer; encrypted-media"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="watch-control-bar">
          <label className="autoplay-next-control" title="Autoplay next">
            <span>Autoplay next</span>
            <input
              aria-label="Autoplay next"
              checked={settings.autoplayNext}
              onChange={(event) => updateSetting('autoplayNext', event.target.checked)}
              role="switch"
              type="checkbox"
            />
          </label>
          <button
            aria-pressed={settings.theaterMode}
            className={`watch-icon-button${settings.theaterMode ? ' is-active' : ''}`}
            onClick={() => updateSetting('theaterMode', !settings.theaterMode)}
            title="Theater mode"
            type="button"
          ><Icon name="theater" /><span className="sr-only">Theater mode</span></button>
          <button className="watch-icon-button" onClick={() => showAppToast('Use the PiP icon in the player controls')} title="Picture in picture" type="button">
            <Icon name="pip" /><span className="sr-only">Picture in picture</span>
          </button>
          <button className="watch-icon-button" onClick={() => showAppToast('Use the CC button in the player to turn subtitles on or off')} title="Captions" type="button">
            <Icon name="captions" /><span className="sr-only">Captions</span>
          </button>
        </div>
        {error ? <ErrorState message={error} onRetry={() => setRetryCount((count) => count + 1)} /> : loading ? (
          <div className="watch-metadata-shimmer"><div /><div /><div /></div>
        ) : video && (
          <>
            <h1 className="watch-title">{video.title}</h1>
            <div className="watch-title-actions">
              <div className="watch-channel-row">
                <span className="channel-avatar">{video.avatar}</span>
                <div className="watch-channel">
                  <strong>{video.channel}</strong>
                  <span>{subscriberCount ? `${formatCompactCount(subscriberCount)} subscribers` : '— subscribers'}</span>
                  {video.channelId && <a href={`https://www.youtube.com/channel/${video.channelId}`} target="_blank" rel="noreferrer">Open channel</a>}
                </div>
                <button
                  className={`subscribe-button${subscribed ? ' is-subscribed' : ''}`}
                  onClick={toggleSubscription}
                  type="button"
                >
                  {subscribed && <Icon name="bell" />}
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>
              <div className="watch-actions">
                <div aria-label="Video rating" className="rating-pill">
                  <button aria-pressed={liked} className={liked ? 'is-active' : ''} onClick={toggleLike} title="Like" type="button">
                    <Icon name="like" /><span>{formatCompactCount(displayedLikeCount)}</span>
                  </button>
                  <span className="rating-divider" />
                  <button aria-pressed={disliked} className={disliked ? 'is-active' : ''} onClick={toggleDislike} title="Dislike" type="button">
                    <Icon name="dislike" /><span className="sr-only">Dislike</span>
                  </button>
                </div>
                <button className="watch-pill-button" onClick={shareVideo} title="Share" type="button"><Icon name="share" />Share</button>
                <button aria-pressed={saved} className={`watch-pill-button${saved ? ' is-active' : ''}`} onClick={toggleSave} title="Save to Watch later" type="button"><Icon name="save" />Save</button>
                <div className="watch-more-menu">
                  <button aria-expanded={menuOpen} aria-label="More actions" className="watch-pill-button watch-more-trigger" onClick={() => setMenuOpen((value) => !value)} title="More" type="button"><Icon name="more" /></button>
                  {menuOpen && <div className="watch-more-dropdown" role="menu">
                    <button onClick={() => { setMenuOpen(false); setReportDialogOpen(true) }} role="menuitem" type="button">Report</button>
                    <button onClick={() => { setMenuOpen(false); showAppToast('Transcript is not available in this demo') }} role="menuitem" type="button">Show transcript</button>
                  </div>}
                </div>
              </div>
            </div>
            {subscriberState.error && subscriberState.channelId === video.channelId && <p className="watch-inline-error" role="alert">{subscriberState.error}</p>}
            <div className={`video-description${descriptionExpanded ? ' is-expanded' : ''}`}>
              <strong>{formatCompactCount(video.viewCount)} views　{video.age}</strong>
              <p><DescriptionText text={video.description} /></p>
              {video.description.length > 120 && <button className="description-toggle" onClick={() => setDescriptionState({ id: video.id, expanded: !descriptionExpanded })} type="button">{descriptionExpanded ? 'Show less' : '...more'}</button>}
            </div>
            {historyError && <p className="history-save-error" role="alert">{historyError}</p>}
            <section className="comments-section">
              <div className="comments-heading">
                <h2>{formatCompactCount(commentsCount)} Comments</h2>
                <label className="comments-sort">
                  <span>Sort by</span>
                  <select aria-label="Sort comments" onChange={(event) => setCommentOrder(event.target.value)} value={commentOrder}>
                    <option value="relevance">Top comments</option>
                    <option value="time">Newest first</option>
                  </select>
                </label>
              </div>
              <form className="add-comment-form" onSubmit={addLocalComment}>
                <span className="comment-avatar comment-avatar-local">Y</span>
                <input
                  aria-label="Add a comment"
                  onChange={(event) => setCommentDraft({ id, text: event.target.value })}
                  placeholder="Add a comment…"
                  value={commentText}
                />
                <button disabled={!commentText.trim()} type="submit">Comment</button>
              </form>
              {commentsDisabled && <p className="comments-message">Comments are turned off for this video.</p>}
              {commentsError && <ErrorState message={commentsError} onRetry={() => setCommentsRetry((count) => count + 1)} />}
              {commentsLoading && <p className="comments-message">Loading comments…</p>}
              <div className="comments-list">
                {[...localComments, ...(!commentsLoading && !commentsError && !commentsDisabled ? comments : [])].map((comment) => (
                  <article className="comment-item" key={comment.id}>
                    {comment.avatar ? <img className="comment-avatar" src={comment.avatar} alt="" loading="lazy" /> : <span className="comment-avatar comment-avatar-local">{comment.author.charAt(0).toUpperCase()}</span>}
                    <div className="comment-content">
                      <div className="comment-byline"><strong>{comment.author}</strong><span>{comment.local ? 'just now · local' : formatTimeAgo(comment.publishedAt)}</span></div>
                      <p>{comment.text}</p>
                      <span className="comment-likes"><Icon name="like" />{formatCompactCount(comment.likeCount)}</span>
                    </div>
                  </article>
                ))}
                {!commentsLoading && !commentsError && !commentsDisabled && !comments.length && !localComments.length && <p className="comments-message">No comments yet.</p>}
                {!commentsLoading && !commentsError && !commentsDisabled && nextCommentToken && <button className="comments-load-more" disabled={loadingMoreComments} onClick={loadMoreComments} type="button">{loadingMoreComments ? 'Loading…' : 'Load more'}</button>}
              </div>
            </section>
          </>
        )}
      </div>
      <aside className="suggested-list" aria-label="Suggested videos">
        {video?.channelId && (
          <div className="suggestion-filters" aria-label="Suggested video filters">
            <button
              aria-pressed={suggestionFilter === 'all'}
              className={suggestionFilter === 'all' ? 'is-active' : ''}
              onClick={() => setSuggestionSelection((current) => ({
                id,
                filter: 'all',
                retry: current.id === id && current.filter === 'all' ? current.retry + 1 : 0,
              }))}
              type="button"
            >All</button>
            <button
              aria-pressed={suggestionFilter === 'channel'}
              className={suggestionFilter === 'channel' ? 'is-active' : ''}
              onClick={() => setSuggestionSelection((current) => ({
                id,
                filter: 'channel',
                retry: current.id === id && current.filter === 'channel' ? current.retry + 1 : 0,
              }))}
              type="button"
            >From {video.channel}</button>
          </div>
        )}
        {suggestionsError && <ErrorState message={suggestionsError} onRetry={() => setSuggestionSelection((current) => ({
          id,
          filter: suggestionFilter,
          retry: (current.id === id ? current.retry : 0) + 1,
        }))} />}
        {suggestionsLoading ? (
          <div className="suggested-skeleton-list" aria-label="Loading suggested videos" aria-busy="true">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="suggested-skeleton" key={index}>
                <div className="suggested-skeleton-thumbnail" />
                <div className="suggested-skeleton-copy"><span /><span /><span /></div>
              </div>
            ))}
          </div>
        ) : suggestions.map((suggestion) => <SuggestedVideo key={suggestion.id} video={suggestion} />)}
        {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && !error && (
          <p className="empty-state">{suggestionFilter === 'channel' ? 'No videos from this channel are available.' : 'No suggested videos are available.'}</p>
        )}
      </aside>
      {reportDialogOpen && video && (
        <Modal className="report-picker-modal" onClose={() => setReportDialogOpen(false)} title="Report video">
          <form className="modal-content report-picker-form" onSubmit={submitReport}>
            <p>Why are you reporting this video?</p>
            <label className="setting-field">
              <span>Reason</span>
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                {['Spam', 'Misleading', 'Hateful', 'Violent', 'Other'].map((reason) => <option key={reason}>{reason}</option>)}
              </select>
            </label>
            <button className="modal-primary-button" type="submit">Submit report</button>
          </form>
        </Modal>
      )}
      {shareDialogOpen && (
        <Modal className="share-modal" onClose={() => setShareDialogOpen(false)} title="Share">
          <div className="modal-content share-content">
            <p>{video?.title}</p>
            <div className="share-link-row">
              <input aria-label="Video link" readOnly value={window.location.href} />
              <button className="modal-primary-button" onClick={copyLink} type="button">Copy</button>
            </div>
            {navigator.share && <button className="modal-secondary-button share-native-button" onClick={shareNatively} type="button">Share…</button>}
            {copyError && <p className="watch-inline-error" role="alert">{copyError}</p>}
          </div>
        </Modal>
      )}
    </section>
  )
}
