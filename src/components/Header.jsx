import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Header({ onMenuClick, onToast, menuOpen, user, onSignIn, onSignOut }) {
  const [query, setQuery] = useState('')
  const [openMenu, setOpenMenu] = useState('')
  const [notificationsSeen, setNotificationsSeen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const headerMenus = useRef(null)
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!headerMenus.current?.contains(event.target)) {
        setOpenMenu('')
      }
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpenMenu('')
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition) return undefined

    recognition.stop()
    recognitionRef.current = null
    return undefined
  }, [location.pathname])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  function toggleVoiceSearch() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      setListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognition || !window.isSecureContext) {
      onToast('Voice search is not supported in this browser, please use Chrome or Edge')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => setListening(true)
    recognition.onresult = (event) => {
      let transcript = ''
      let finalTranscript = ''
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index]
        transcript += result[0].transcript
        if (result.isFinal) finalTranscript += result[0].transcript
      }
      setQuery(transcript)

      if (finalTranscript.trim()) {
        const term = finalTranscript.trim()
        recognitionRef.current = null
        recognition.stop()
        setListening(false)
        navigate(`/search/${encodeURIComponent(term)}`)
      }
    }
    recognition.onerror = (event) => {
      recognitionRef.current = null
      setListening(false)
      const messages = {
        'not-allowed': 'Microphone permission is blocked',
        'service-not-allowed': 'Microphone permission is blocked',
        'no-speech': "Didn't catch that, try again",
        network: 'Voice search network error, please check your connection and try again',
      }
      onToast(messages[event.error] ?? 'Voice search failed, please try again')
    }
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null
      setListening(false)
    }

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setListening(false)
      onToast('Voice search could not start, please try again')
    }
  }

  function search(event) {
    event.preventDefault()
    const term = query.trim()
    if (term) navigate(`/search/${encodeURIComponent(term)}`)
  }

  return (
    <header className="topbar">
      <div className="brand-area">
        <button
          className="icon-button menu-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={onMenuClick}
          type="button"
        >☰</button>
        <Link className="brand" to="/" aria-label="YouTube home">
          <span className="brand-mark">▶</span><span>YouTube</span><sup>US</sup>
        </Link>
      </div>
      <form className="search-form" onSubmit={search} role="search">
        <input
          aria-label="Search"
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="search-button" aria-label="Submit search">⌕</button>
        <button
          className={`icon-button voice-button${listening ? ' is-listening' : ''}`}
          type="button"
          aria-label="Voice search"
          aria-pressed={listening}
          onClick={toggleVoiceSearch}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
            <path d="M19 11a7 7 0 0 1-14 0M12 18v4m-4 0h8" />
          </svg>
        </button>
      </form>
      <div className="header-actions" ref={headerMenus}>
        <div className="header-menu-anchor">
          <button
            className="create-button"
            aria-label="Create"
            aria-expanded={openMenu === 'create'}
            onClick={() => setOpenMenu((current) => current === 'create' ? '' : 'create')}
            type="button"
          ><span className="create-plus" aria-hidden="true">＋</span><span className="create-label">Create</span></button>
          {openMenu === 'create' && (
            <div className="header-dropdown" role="menu">
              {['Upload video', 'Go live'].map((label) => (
                <button className="dropdown-action" key={label} role="menuitem" type="button" onClick={() => {
                  setOpenMenu('')
                  onToast('Demo only')
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="header-menu-anchor">
          <button
            className="icon-button notification-button"
            aria-label="Notifications"
            aria-expanded={openMenu === 'notifications'}
            onClick={() => {
              setNotificationsSeen(true)
              setOpenMenu((current) => current === 'notifications' ? '' : 'notifications')
            }}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
            </svg>
            {!notificationsSeen && <span className="notification-badge">3</span>}
          </button>
          {openMenu === 'notifications' && (
            <div className="header-dropdown notification-dropdown">
              <strong>Notifications</strong>
              {[
                ['M', 'New video from Music Lab', '2 hours ago', 'avatar-m', 'dQw4w9WgXcQ'],
                ['D', 'Design Daily shared a new upload', '5 hours ago', 'avatar-d', '9bZkp7q19f0'],
                ['T', 'Tech Today is live now', 'Yesterday', 'avatar-s', 'jNQXAC9IVRw'],
              ].map(([initial, title, time, avatarClass, videoId]) => (
                <button
                  className="notification-item"
                  key={title}
                  onClick={() => {
                    setOpenMenu('')
                    navigate(`/watch/${videoId}`)
                  }}
                  type="button"
                >
                  <span className={`notification-avatar ${avatarClass}`}>{initial}</span>
                  <span className="notification-copy"><span>{title}</span><small>{time}</small></span>
                  <span className="notification-thumbnail" aria-hidden="true">▶</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="header-menu-anchor">
          <button
            className="avatar"
            aria-label="Account"
            aria-expanded={openMenu === 'account'}
            onClick={() => setOpenMenu((current) => current === 'account' ? '' : 'account')}
            type="button"
          >{user?.picture ? <img src={user.picture} alt="" /> : (user?.name?.charAt(0).toUpperCase() || 'A')}</button>
          {openMenu === 'account' && (
            <div className="header-dropdown account-dropdown" role="menu">
              <div className="dropdown-account-name">
                <span className="avatar">
                  {user?.picture ? <img src={user.picture} alt="" /> : (user?.name?.charAt(0).toUpperCase() || 'A')}
                </span>
                <span className="dropdown-account-copy">
                  <strong>{user?.name || 'Account'}</strong>
                  {user && <small>{user.email}</small>}
                </span>
              </div>
              <div className="dropdown-divider" />
              {[
                ['History', '/history'],
                ['Library', '/library'],
                ['Subscriptions', '/subscriptions'],
              ].map(([label, to]) => (
                <Link className="dropdown-action" key={label} role="menuitem" to={to} onClick={() => setOpenMenu('')}>{label}</Link>
              ))}
              <div className="dropdown-divider" />
              <button className="dropdown-action" role="menuitem" type="button" onClick={() => {
                setOpenMenu('')
                if (user) onSignOut()
                else onSignIn()
              }}>{user ? 'Sign out' : 'Sign in'}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
