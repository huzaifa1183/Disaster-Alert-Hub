import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, Bell, Check, ChevronDown, CloudSun, Compass, Menu, Search, ShieldAlert, ShieldCheck, Siren, X } from 'lucide-react'
import { useAlerts } from '../App.jsx'
import { formatTime } from '../utils/format.js'
import Chatbot from './Chatbot.jsx'

const links = [
  { to: '/', label: 'Overview', icon: Compass, end: true },
  { to: '/alerts', label: 'Live alerts', icon: Bell },
  { to: '/map', label: 'Map', icon: Activity },
  { to: '/weather', label: 'Weather', icon: CloudSun },
  { to: '/preparedness', label: 'Preparedness', icon: ShieldCheck },
  { to: '/contacts', label: 'Contacts', icon: Siren },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { alertsError, mockDataEnabled, toast, setToast, notifications, setNotifications } = useAlerts()
  const unread = notifications.filter((item) => !item.read).length

  const submitSearch = (event) => {
    event.preventDefault()
    navigate(`/alerts?search=${encodeURIComponent(search.trim())}`)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="demo-strip"><span><ShieldAlert size={14} /> {mockDataEnabled ? 'MOCK DATA ENABLED' : 'NO OFFICIAL ALERT FEED CONNECTED'}</span><span>This app supplements, and does not replace, official government warnings.{alertsError ? ' Live alert API unavailable.' : ''}</span><Link to="/about">About this project <span aria-hidden="true">↗</span></Link></div>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Disaster Alert Hub home">
          <span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>
          <span className="brand-words"><strong>DISASTER</strong><span>ALERT HUB</span></span>
        </Link>
        <form className="global-search" onSubmit={submitSearch} role="search">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alert, city or state" aria-label="Search alerts, cities or states" />
          <kbd>↵</kbd>
        </form>
        <div className="topbar-actions">
          <span className={`sync-status ${mockDataEnabled ? 'is-connected' : ''}`}><span className="sync-dot" /> {alertsError ? 'API UNAVAILABLE' : mockDataEnabled ? 'MOCK DATA' : 'NO ALERT FEED'}</span>
          <div className="notification-control"><button className="notification-button" type="button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label={`Notifications, ${unread} unread`} aria-expanded={notificationsOpen}><Bell size={17} />{unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}</button>{notificationsOpen && <div className="notification-popover"><div className="notification-head"><div><strong>Notifications</strong><span>{unread ? `${unread} unread` : 'No new activity'}</span></div><button onClick={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))} title="Mark all read"><Check size={15} /></button></div>{notifications.length ? <div className="notification-list">{notifications.slice(0, 8).map((item) => <Link key={item._id || item.createdAt} to={item.alertId ? `/alerts/${item.alertId}` : '/admin'} onClick={() => { setNotifications((current) => current.map((entry) => entry._id === item._id ? { ...entry, read: true } : entry)); setNotificationsOpen(false) }} className={`notification-item ${item.read ? '' : 'notification-unread'}`}><span className="notification-mark"><Bell size={14} /></span><span><strong>{item.title}</strong><small>{item.message}</small><time>{item.createdAt ? formatTime(item.createdAt) : 'Just now'}</time></span></Link>)}</div> : <div className="notification-empty"><Bell size={19} /><span>No notifications yet</span><small>Official alert feed is not connected.</small></div>}<div className="notification-foot">OFFICIAL FEED NOT CONNECTED</div></div>}</div>
          <button className="language-button" type="button" aria-label="Language selector"><span>EN</span><ChevronDown size={13} /></button>
          <Link className="admin-link" to="/admin"><ShieldCheck size={15} /> Admin</Link>
          <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
        {links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}><Icon size={16} />{label}{label === 'Live alerts' && <span className="nav-alert-dot" />}</NavLink>)}
      </nav>
      <main className="page-wrap"><Outlet /></main>
      <footer className="site-footer"><span>DISASTER ALERT HUB</span><span>This app supplements, and does not replace, official government warnings.</span></footer>
      {toast && <div className="toast" role="status"><span className="toast-icon"><Bell size={17} /></span><span><strong>{toast.title}</strong><small>{toast.message}</small></span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={16} /></button></div>}
      <Chatbot />
    </div>
  )
}