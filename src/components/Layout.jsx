import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'
import Modal from './Modal.jsx'
import { clearGoogleUser, startGoogleSignIn, useGoogleUser } from '../lib/googleAuth.js'
import { clearSubscriptions } from '../lib/subscriptions.js'
import { clearWatchHistory } from '../lib/watchHistory.js'
import { clearYouTubeApiCache } from '../lib/youtubeApi.js'
import { getReports, saveAppSettings, saveFeedback, useAppSettings } from '../lib/appData.js'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Layout() {
  const location = useLocation()
  const [openAtPath, setOpenAtPath] = useState('')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [toast, setToast] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 800px)').matches)
  const [activeModal, setActiveModal] = useState('')
  const [reports, setReports] = useState([])
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState('Bug')
  const user = useGoogleUser()
  const settings = useAppSettings()
  const mobileDrawerOpen = openAtPath === location.pathname

  function signIn() {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
      setToast('Add VITE_GOOGLE_CLIENT_ID to .env to enable Google sign-in')
      return
    }
    startGoogleSignIn(
      GOOGLE_CLIENT_ID,
      (signedInUser) => setToast(`Signed in as ${signedInUser.name}`),
      (error) => setToast(error.message || 'Google sign-in failed. Please try again.'),
    )
  }

  function signOut() {
    try {
      clearGoogleUser()
      setToast('Signed out')
    } catch (error) {
      setToast(error.message || 'Could not sign out. Please try again.')
    }
  }

  function openModal(name) {
    setOpenAtPath('')
    setFeedbackText('')
    if (name === 'reports') setReports(getReports())
    setActiveModal(name)
  }

  function closeModal() {
    setActiveModal('')
  }

  function updateSetting(change) {
    try {
      saveAppSettings(change)
    } catch (error) {
      setToast(error.message || 'Settings could not be saved.')
    }
  }

  function clearHistory() {
    const error = clearWatchHistory()
    setToast(error || 'Watch history cleared')
  }

  function clearSavedSubscriptions() {
    setToast(clearSubscriptions() ? 'Subscriptions cleared' : 'Subscriptions could not be cleared')
  }

  function clearCachedData() {
    try {
      clearYouTubeApiCache()
      setToast('Cached data cleared')
    } catch (error) {
      setToast(error.message || 'Cached data could not be cleared.')
    }
  }

  function sendFeedback(event) {
    event.preventDefault()
    const text = feedbackText.trim()
    if (!text) return
    try {
      saveFeedback({ text, category: feedbackCategory })
      closeModal()
      setToast('Thanks for your feedback')
    } catch (error) {
      setToast(error.message || 'Feedback could not be saved.')
    }
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 800px)')
    function updateMobileMode() {
      setIsMobile(mediaQuery.matches)
      setOpenAtPath('')
    }
    mediaQuery.addEventListener('change', updateMobileMode)
    return () => mediaQuery.removeEventListener('change', updateMobileMode)
  }, [])

  useEffect(() => {
    if (!mobileDrawerOpen && !toast) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpenAtPath('')
        setToast('')
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileDrawerOpen, toast])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    function showToast(event) {
      setToast(event.detail)
    }
    window.addEventListener('youtube-clone-toast', showToast)
    return () => window.removeEventListener('youtube-clone-toast', showToast)
  }, [])

  function toggleSidebar() {
    if (isMobile) {
      setOpenAtPath(mobileDrawerOpen ? '' : location.pathname)
    } else {
      setSidebarExpanded((expanded) => !expanded)
    }
  }

  return (
    <div className="app-shell">
      <Header
        onMenuClick={toggleSidebar}
        onToast={setToast}
        menuOpen={isMobile ? mobileDrawerOpen : sidebarExpanded}
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
      />
      <div className="app-body">
        {mobileDrawerOpen && <button className="sidebar-backdrop" aria-label="Close navigation menu" onClick={() => setOpenAtPath('')} />}
        <Sidebar
          open={sidebarExpanded}
          drawerOpen={mobileDrawerOpen}
          onNavigate={() => setOpenAtPath('')}
          onToast={setToast}
          user={user}
          onSignIn={() => {
            setOpenAtPath('')
            signIn()
          }}
          onOpenModal={openModal}
        />
        <main className="main-content">
          <Outlet context={{ onToast: setToast }} />
        </main>
      </div>
      {activeModal === 'settings' && (
        <Modal onClose={closeModal} title="Settings">
          <div className="modal-content settings-content">
            <label className="setting-toggle">
              <span>Autoplay videos on watch page</span>
              <input
                checked={settings.autoplay}
                onChange={(event) => updateSetting({ autoplay: event.target.checked })}
                type="checkbox"
              />
            </label>
            <label className="setting-field">
              <span>Region</span>
              <select value={settings.regionCode} onChange={(event) => updateSetting({ regionCode: event.target.value })}>
                {['IN', 'US', 'GB', 'CA', 'AU'].map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </label>
            <div className="settings-actions">
              <button className="modal-secondary-button" onClick={clearHistory} type="button">Clear watch history</button>
              <button className="modal-secondary-button" onClick={clearSavedSubscriptions} type="button">Clear subscriptions</button>
              <button className="modal-secondary-button" onClick={clearCachedData} type="button">Clear cached data</button>
            </div>
            <p className="modal-about">YouTube Clone built with React, Vite, Tailwind and YouTube Data API v3</p>
          </div>
        </Modal>
      )}
      {activeModal === 'reports' && (
        <Modal onClose={closeModal} title="Report history">
          <div className="modal-content report-history-list">
            {reports.length === 0 ? <p className="modal-empty-state">You haven't reported any videos</p> : reports.map((report, index) => (
              <article className="report-history-item" key={`${report.videoId}-${report.date}-${index}`}>
                <strong>{report.title}</strong>
                <span>Reason: {report.reason}</span>
                <time dateTime={report.date}>{new Date(report.date).toLocaleString()}</time>
              </article>
            ))}
          </div>
        </Modal>
      )}
      {activeModal === 'feedback' && (
        <Modal onClose={closeModal} title="Send feedback">
          <form className="modal-content feedback-form" onSubmit={sendFeedback}>
            <label className="setting-field">
              <span>Category</span>
              <select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value)}>
                {['Bug', 'Suggestion', 'Other'].map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="feedback-textarea-label" htmlFor="feedback-text">Tell us what you think</label>
            <textarea
              id="feedback-text"
              maxLength={500}
              onChange={(event) => setFeedbackText(event.target.value)}
              value={feedbackText}
            />
            <span className="feedback-counter">{feedbackText.length}/500</span>
            <button className="modal-primary-button" disabled={!feedbackText.trim()} type="submit">Send</button>
          </form>
        </Modal>
      )}
      {toast && <div className="demo-toast" role="status">{toast}</div>}
    </div>
  )
}
