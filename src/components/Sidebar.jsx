import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useSubscriptions } from '../lib/subscriptions.js'

const icons = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
  shorts: <><path d="m16.5 3.5 3.2 1.8a3.1 3.1 0 0 1-1.5 5.8H16l3.1 1.8a3.3 3.3 0 0 1-3.2 5.8l-9.4-5.2a3.1 3.1 0 0 1 1.5-5.8H10L6.9 5.9a3.3 3.3 0 0 1 3.2-5.8z" /><path d="m10 8 5 4-5 4z" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  down: <path d="m6 9 6 6 6-6" />,
  channel: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></>,
  playlist: <><path d="M4 6h13M4 11h13M4 16h8" /><path d="m17 15 4 3-4 3z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  like: <path d="M7 10v10H4V10zm0 9h10.2a2 2 0 0 0 1.9-1.4l1.5-5A2 2 0 0 0 18.7 10H14l.7-3.3A2.2 2.2 0 0 0 12.5 4L7 10z" />,
  download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M4 18v3h16v-3" /></>,
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  movie: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m10 9 5 3-5 3zM3 9h3m-3 6h3m12-6h3m-3 6h3" /></>,
  fire: <path d="M12 22a7 7 0 0 0 7-7c0-3-2-5-4-7 0 3-2 4-2 4 0-5-3-9-5-10 1 5-4 8-4 13a8 8 0 0 0 8 7z" />,
  live: <><circle cx="12" cy="12" r="2" /><path d="M7 7a7 7 0 0 0 0 10m10 0a7 7 0 0 0 0-10M4 4a11 11 0 0 0 0 16m16 0a11 11 0 0 0 0-16" /></>,
  game: <><path d="M6 9h12a4 4 0 0 1 3.8 5l-1 3a2 2 0 0 1-3.2 1L15 15H9l-2.6 3a2 2 0 0 1-3.2-1l-1-3A4 4 0 0 1 6 9z" /><path d="M7 11v4m-2-2h4m7-1h.01m2 2h.01" /></>,
  news: <><path d="M4 5h16v15H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm4 4h8m-8 4h8m-8 4h5" /><path d="M4 5v13" /></>,
  sports: <><circle cx="12" cy="12" r="9" /><path d="m8 4 2 5-4 3m12-3-5 1-3-4m4 14-1-5 4-3M4 15l5-1 3 5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8z" /></>,
  flag: <><path d="M5 21V4m0 1h12l-2 4 2 4H5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.9c-1.2 1-1.9 1.4-1.9 3.1m0 3h.01" /></>,
  feedback: <><path d="M4 5h16v12H9l-5 4z" /><path d="M8 9h8m-8 4h5" /></>,
  premium: <><path d="m3 18 2-12 7 7 7-7 2 12z" /><path d="M5 21h14" /></>,
}

const channelColors = ['channel-yellow', 'channel-blue', 'channel-green', 'channel-red', 'channel-purple', 'channel-orange', 'channel-teal']

function Icon({ name, className = '' }) {
  return (
    <svg className={`sidebar-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}

function SidebarLink({ icon, label, to, onNavigate, mini = false }) {
  return (
    <NavLink
      className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}${mini ? ' sidebar-mini-link' : ''}`}
      end={to === '/'}
      key={label}
      onClick={onNavigate}
      title={mini ? label : undefined}
      to={to}
    >
      <Icon name={icon} />
      <span className="sidebar-link-label">{label}</span>
    </NavLink>
  )
}

function ActionRow({ icon, label, onClick, mini = false }) {
  return (
    <button className={`sidebar-link sidebar-action${mini ? ' sidebar-mini-link' : ''}`} onClick={onClick} title={mini ? label : undefined} type="button">
      <Icon name={icon} />
      <span className="sidebar-link-label">{label}</span>
    </button>
  )
}

function SectionHeading({ children, to, onNavigate }) {
  const content = <>{children}<Icon name="chevron" className="heading-chevron" /></>
  return to ? <Link className="sidebar-heading" onClick={onNavigate} to={to}>{content}</Link> : <h2 className="sidebar-heading">{content}</h2>
}

function ShowToggle({ expanded, onClick }) {
  return (
    <button className="sidebar-link show-toggle" onClick={onClick} type="button">
      <Icon name={expanded ? 'down' : 'down'} className={expanded ? 'toggle-expanded' : ''} />
      <span className="sidebar-link-label">Show {expanded ? 'less' : 'more'}</span>
    </button>
  )
}

function ChannelRow({ channel, onClick }) {
  const { channelTitle, channelId } = channel
  const colorIndex = [...channelId].reduce((total, character) => total + character.charCodeAt(0), 0) % channelColors.length
  return (
    <button className="sidebar-link channel-link" onClick={onClick} title={channelTitle} type="button">
      <span className={`channel-avatar-circle ${channelColors[colorIndex]}`}>{channelTitle.charAt(0).toUpperCase()}</span>
      <span className="sidebar-link-label channel-name">{channelTitle}</span>
    </button>
  )
}

export default function Sidebar({ open, drawerOpen, onNavigate, onToast, user, onSignIn, onOpenModal }) {
  const [channelsExpanded, setChannelsExpanded] = useState(false)
  const [youExpanded, setYouExpanded] = useState(false)
  const [exploreExpanded, setExploreExpanded] = useState(false)
  const navigate = useNavigate()
  const subscriptions = useSubscriptions()
  const channels = channelsExpanded ? subscriptions : subscriptions.slice(0, 6)

  function searchChannel(name) {
    onNavigate()
    navigate(`/search/${encodeURIComponent(name)}`)
  }

  return (
    <aside
      className={`sidebar${open ? ' is-expanded' : ' is-collapsed'}${drawerOpen ? ' is-open' : ''}`}
      id="app-sidebar"
    >
      <div className="sidebar-scroll">
        <div className="sidebar-mini-group">
          <SidebarLink icon="home" label="Home" to="/" onNavigate={onNavigate} mini />
          <SidebarLink icon="shorts" label="Shorts" to="/shorts" onNavigate={onNavigate} mini />
          <SidebarLink icon="channel" label="Subscriptions" to="/subscriptions" onNavigate={onNavigate} mini />
          <SidebarLink icon="channel" label="You" to="/library" onNavigate={onNavigate} mini />
          <ActionRow icon="settings" label="Settings" mini onClick={() => onOpenModal('settings')} />
          <ActionRow icon="flag" label="Report history" mini onClick={() => onOpenModal('reports')} />
          <a className="sidebar-link sidebar-mini-link" href="https://support.google.com/youtube" rel="noopener noreferrer" target="_blank" title="Help">
            <Icon name="help" />
            <span className="sidebar-link-label">Help</span>
          </a>
          <ActionRow icon="feedback" label="Send feedback" mini onClick={() => onOpenModal('feedback')} />
        </div>

        <div className="sidebar-full-content">
          <div className="sidebar-section sidebar-top-section">
            <SidebarLink icon="home" label="Home" to="/" onNavigate={onNavigate} />
            <SidebarLink icon="shorts" label="Shorts" to="/shorts" onNavigate={onNavigate} />
          </div>

          {!user && <div className="sidebar-signin-prompt">
            <p>Sign in to like videos, comment, and subscribe.</p>
            <button className="sidebar-signin-button" onClick={onSignIn} type="button">
              <span aria-hidden="true">●</span> Sign in
            </button>
          </div>}

          {subscriptions.length > 0 && (
          <div className="sidebar-section">
            <SectionHeading to="/subscriptions" onNavigate={onNavigate}>Subscriptions</SectionHeading>
            {channels.map((channel) => (
              <ChannelRow channel={channel} key={channel.channelId} onClick={() => searchChannel(channel.channelTitle)} />
            ))}
            {subscriptions.length > 6 && <ShowToggle expanded={channelsExpanded} onClick={() => setChannelsExpanded((value) => !value)} />}
          </div>
          )}

          <div className="sidebar-section">
            <SectionHeading to="/library" onNavigate={onNavigate}>You</SectionHeading>
            <ActionRow icon="channel" label="Your channel" onClick={() => onToast('Demo only')} />
            <SidebarLink icon="history" label="History" to="/history" onNavigate={onNavigate} />
            <SidebarLink icon="playlist" label="Playlists" to="/library" onNavigate={onNavigate} />
            {youExpanded && (
              <>
                <SidebarLink icon="clock" label="Watch Later" to="/library" onNavigate={onNavigate} />
                <SidebarLink icon="like" label="Liked videos" to="/library" onNavigate={onNavigate} />
                <ActionRow icon="playlist" label="Your videos" onClick={() => onToast('Demo only')} />
                <ActionRow icon="download" label="Downloads" onClick={() => onToast('Demo only')} />
              </>
            )}
            <ShowToggle expanded={youExpanded} onClick={() => setYouExpanded((value) => !value)} />
          </div>

          <div className="sidebar-section">
            <SectionHeading>Explore</SectionHeading>
            <SidebarLink icon="music" label="Music" to="/search/music" onNavigate={onNavigate} />
            <SidebarLink icon="movie" label="Movies & TV" to="/search/movies" onNavigate={onNavigate} />
            <SidebarLink icon="fire" label="Hype" to="/search/hype" onNavigate={onNavigate} />
            {exploreExpanded && (
              <>
                <SidebarLink icon="live" label="Live" to="/search/live" onNavigate={onNavigate} />
                <SidebarLink icon="game" label="Gaming" to="/search/gaming" onNavigate={onNavigate} />
                <SidebarLink icon="news" label="News" to="/search/news" onNavigate={onNavigate} />
                <SidebarLink icon="sports" label="Sports" to="/search/sports" onNavigate={onNavigate} />
              </>
            )}
            <ShowToggle expanded={exploreExpanded} onClick={() => setExploreExpanded((value) => !value)} />
          </div>

          <div className="sidebar-section">
            <SectionHeading>More from YouTube</SectionHeading>
            {[
              ['YouTube Premium', 'https://www.youtube.com/premium'],
              ['YouTube Music', 'https://music.youtube.com'],
              ['YouTube Kids', 'https://youtubekids.com'],
            ].map(([label, href]) => (
              <a className="sidebar-link" href={href} key={label} onClick={onNavigate} rel="noopener noreferrer" target="_blank">
                <svg className="sidebar-icon youtube-red-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23 7a3 3 0 0 0-2-2C19 4.5 12 4.5 12 4.5s-7 0-9 .5a3 3 0 0 0-2 2A31 31 0 0 0 .5 12 31 31 0 0 0 1 17a3 3 0 0 0 2 2c2 .5 9 .5 9 .5s7 0 9-.5a3 3 0 0 0 2-2 31 31 0 0 0 .5-5 31 31 0 0 0-.5-5z" />
                  <path className="youtube-play-mark" d="m9.5 8.5 6 3.5-6 3.5z" />
                </svg>
                <span className="sidebar-link-label">{label}</span>
              </a>
            ))}
          </div>

          <div className="sidebar-section">
            <ActionRow icon="settings" label="Settings" onClick={() => onOpenModal('settings')} />
            <ActionRow icon="flag" label="Report history" onClick={() => onOpenModal('reports')} />
            <a className="sidebar-link" href="https://support.google.com/youtube" rel="noopener noreferrer" target="_blank" onClick={onNavigate}>
              <Icon name="help" />
              <span className="sidebar-link-label">Help</span>
            </a>
            <ActionRow icon="feedback" label="Send feedback" onClick={() => onOpenModal('feedback')} />
          </div>

          <footer className="sidebar-footer">
            <p>About　Press　Copyright　Contact us　Creators　Advertise　Developers</p>
            <p>Terms　Privacy　Policy &amp; Safety　How YouTube works　Test new features</p>
            <small>© 2026 Google LLC</small>
          </footer>
        </div>
      </div>
    </aside>
  )
}
