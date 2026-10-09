import { useVideoLibrary } from '../lib/videoLibrary.js'
import VideoCard from './VideoCard.jsx'

export default function Library() {
  const { watchLater, liked } = useVideoLibrary()

  return (
    <section className="page-section account-data-page">
      <h1 className="page-title">You</h1>
      <section className="library-section">
        <h2 className="page-title">Watch later</h2>
        {watchLater.length
          ? <div className="video-grid">{watchLater.map((video) => <VideoCard key={video.id} video={video} />)}</div>
          : <p className="library-empty">Your Watch later list is empty.</p>}
      </section>
      <section className="library-section">
        <h2 className="page-title">Liked videos</h2>
        {liked.length
          ? <div className="video-grid">{liked.map((video) => <VideoCard key={video.id} video={video} />)}</div>
          : <p className="library-empty">You haven’t liked any videos yet.</p>}
      </section>
    </section>
  )
}
