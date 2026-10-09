export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <span className="error-icon" aria-hidden="true">!</span>
      <div>
        <h2>Couldn’t load videos</h2>
        <p>{message}</p>
        {onRetry && <button className="text-button error-retry" onClick={onRetry}>Try again</button>}
      </div>
    </div>
  )
}
