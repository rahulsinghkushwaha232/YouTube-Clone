import { Link } from 'react-router-dom'

export default function SuggestedVideo({ video }) {
  return (
    <Link className="suggested-video" to={`/watch/${video.id}`}>
      <div className="suggested-thumbnail-wrap">
        <img src={video.thumbnail} alt="" loading="lazy" />
        {video.duration && <span className="video-duration">{video.duration}</span>}
      </div>
      <div>
        <p className="suggested-title">{video.title}</p>
        <p className="video-meta">{video.channel}</p>
        <p className="video-meta">{video.views} <span className="meta-dot">·</span> {video.age}</p>
      </div>
    </Link>
  )
}
