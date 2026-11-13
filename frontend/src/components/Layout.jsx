import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, Bell, Check, ChevronDown, CloudSun, Compass, Menu, Search, ShieldAlert, ShieldCheck, Siren, X } from 'lucide-react'
import { useAlerts } from '../App.jsx'
import { formatTime } from '../utils/format.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Chatbot from './Chatbot.jsx'

const links = [
  { to: '/', label: 'overview', icon: Compass, end: true },
  { to: '/alerts', label: 'liveAlerts', icon: Bell },
  { to: '/map', label: 'map', icon: Activity },
  { to: '/weather', label: 'weather', icon: CloudSun },
  { to: '/preparedness', label: 'preparedness', icon: ShieldCheck },
  { to: '/contacts', label: 'contacts', icon: Siren },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { language, locale, setLanguage, languages, t } = useLanguage()
  const { alertsError, alertsWarning, mockDataEnabled, officialAlertFeed, toast, setToast, notifications, setNotifications } = useAlerts()
  const unread = notifications.filter((item) => !item.read).length
  const feedLabel = mockDataEnabled
    ? 'MOCK DATA ENABLED'
    : officialAlertFeed === 'connected'
      ? 'SACHET/NDMA CONNECTED'
      : officialAlertFeed === 'stale'
        ? 'SACHET/NDMA CACHED'
        : officialAlertFeed === 'connecting'
          ? 'CONNECTING TO SACHET/NDMA'
          : 'SACHET/NDMA UNAVAILABLE'

  const submitSearch = (event) => {
    event.preventDefault()
    navigate(`/alerts?search=${encodeURIComponent(search.trim())}`)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="demo-strip"><span><ShieldAlert size={14} /> {feedLabel}</span><span>{t('projectDisclaimer')}{alertsError ? ` ${alertsError}` : alertsWarning ? ` ${alertsWarning}` : ''}</span><Link to="/about">{t('about')} <span aria-hidden="true">↗</span></Link></div>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Disaster Alert Hub home">
          <span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>
          <span className="brand-words"><strong>DISASTER</strong><span>ALERT HUB</span></span>
        </Link>
        <form className="global-search" onSubmit={submitSearch} role="search">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('search')} aria-label={t('search')} />
          <kbd>↵</kbd>
        </form>
        <div className="topbar-actions">
          <span className={`sync-status ${mockDataEnabled || officialAlertFeed === 'connected' ? 'is-connected' : ''}`}><span className="sync-dot" /> {alertsError ? 'API UNAVAILABLE' : feedLabel}</span>
          <div className="notification-control"><button className="notification-button" type="button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label={`${t('officialNotifications')}, ${unread} unread`} aria-expanded={notificationsOpen}><Bell size={17} />{unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}</button>{notificationsOpen && <div className="notification-popover"><div className="notification-head"><div><strong>{t('officialNotifications')}</strong><span>{unread ? `${unread} unread` : t('noNewAlerts')}</span></div><button onClick={() => setNotifications((current) => current.map((item) => ({ ...item, read: true })))} title={t('markAllRead')}><Check size={15} /></button></div>{notifications.length ? <div className="notification-list">{notifications.slice(0, 8).map((item) => <Link key={item._id || item.createdAt} to={`/alerts/${item.alertId}`} onClick={() => { setNotifications((current) => current.map((entry) => entry._id === item._id ? { ...entry, read: true } : entry)); setNotificationsOpen(false) }} className={`notification-item ${item.read ? '' : 'notification-unread'}`}><span className="notification-mark"><Bell size={14} /></span><span><strong>{item.title}</strong><small>{item.message}</small><time>{item.createdAt ? formatTime(item.createdAt, locale) : t('justNow')}</time></span></Link>)}</div> : <div className="notification-empty"><Bell size={19} /><span>{t('noOfficialNotifications')}</span><small>Notifications here come from SACHET/NDMA.</small></div>}<div className="notification-foot">ALERT SOURCE: {feedLabel}</div></div>}</div>
          <label className="language-select">
            <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('language')}>
              {languages.map(({ code, nativeName, name }) => <option key={code} value={code}>{nativeName || name}</option>)}
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </label>
          <Link className="admin-link" to="/admin"><ShieldCheck size={15} /> {t('admin')}</Link>
          <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? t('closeNavigation') : t('openNavigation')}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label={t('mainNavigation')}>
        {links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}><Icon size={16} />{t(label)}{label === 'liveAlerts' && <span className="nav-alert-dot" />}</NavLink>)}
      </nav>
      <main className="page-wrap"><Outlet /></main>
      <footer className="site-footer"><span>DISASTER ALERT HUB</span><span>{t('projectDisclaimer')}</span></footer>
      {toast && <div className="toast" role="status"><span className="toast-icon"><Bell size={17} /></span><span><strong>{toast.title}</strong><small>{toast.message}</small></span><button onClick={() => setToast(null)} aria-label={t('dismiss')}><X size={16} /></button></div>}
      <Chatbot />
    </div>
  )
}