import { Link } from 'react-router-dom'
import { formatTimeAgo } from '../lib/youtubeApi.js'

export default function VideoCard({ video }) {
  return (
    <article className="video-card">
      <Link className="thumbnail-link" to={`/watch/${video.id}`} aria-label={`Watch ${video.title}`}>
        <img className="thumbnail" src={video.thumbnail} alt="" loading="lazy" />
        {video.duration && <span className="video-duration">{video.duration}</span>}
      </Link>
      <div className="video-details">
        <span className={`channel-avatar avatar-${video.avatar.toLowerCase()}`} aria-hidden="true">{video.avatar}</span>
        <div className="video-copy">
          <Link className="video-title" to={`/watch/${video.id}`}>{video.title}</Link>
          <p className="video-meta channel-name">{video.channel}{video.verified && <span className="verified" aria-label="Verified"> ✓</span>}</p>
          <p className="video-meta">{video.views} <span className="meta-dot">·</span> {video.age}</p>
          {video.watchedAt && <p className="video-meta">Watched {formatTimeAgo(video.watchedAt)}</p>}
        </div>
        <button className="card-more" aria-label={`More options for ${video.title}`}>⋮</button>
      </div>
    </article>
  )
}
