export default function Shimmer({ count = 6 }) {
  return (
    <div className="video-grid shimmer-grid" aria-label="Loading videos" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="shimmer-card" key={index}>
          <div className="shimmer-block shimmer-thumbnail" />
          <div className="shimmer-card-copy"><div className="shimmer-block shimmer-avatar" /><div className="shimmer-lines"><div className="shimmer-block" /><div className="shimmer-block" /></div></div>
        </div>
      ))}
    </div>
  )
}
