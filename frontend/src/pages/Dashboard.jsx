import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, ArrowUpRight, CloudRain, MapPinned, Radio, ShieldAlert, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAlerts } from '../App.jsx'
import AlertCard from '../components/AlertCard.jsx'
import AlertMap from '../components/AlertMap.jsx'
import { request } from '../services/api.js'
import { formatTime } from '../utils/format.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const colors = { CRITICAL: '#d63f3f', HIGH: '#ed8a31', MEDIUM: '#d1a52e', LOW: '#2f8d71', UNKNOWN: '#718096' }

export default function Dashboard() {
  const { language, locale, t } = useLanguage()
  const { alerts, alertsError, alertsWarning, mockDataEnabled, officialAlertFeed, reportUpdates } = useAlerts()
  const [communityReports, setCommunityReports] = useState(null)
  useEffect(() => {
    let active = true
    request('/reports')
      .then((reports) => { if (active && Array.isArray(reports)) setCommunityReports(reports) })
      .catch(() => { if (active) setCommunityReports(null) })
    return () => { active = false }
  }, [reportUpdates])
  const active = alerts.filter((alert) => alert.status !== 'Resolved')
  const critical = active.filter((alert) => alert.severity === 'CRITICAL').length
  const states = new Set(active.map((alert) => alert.state)).size
  const severityData = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].map((name) => ({ name, value: active.filter((alert) => alert.severity === name).length }))
  const trendData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setDate(day.getDate() - (6 - index))
    const label = new Intl.DateTimeFormat(language, { weekday: 'short' }).format(day)
    const value = active.filter((alert) => new Date(alert.timestamp).toDateString() === day.toDateString()).length
    return { day: label, alerts: value }
  }), [active, language])
  const recent = [...active].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 4)

  return (
    <div className="page-enter">
      <div className="page-heading dashboard-heading"><div><div className="eyebrow"><Radio size={14} /> {t('overview').toUpperCase()}</div><h1>{t('situationOverview')}</h1><p>Alert source: {mockDataEnabled ? 'opt-in mock data' : `SACHET/NDMA CAP · ${officialAlertFeed}`} <span className="date-stamp">· {new Intl.DateTimeFormat(language, { dateStyle: 'full' }).format(new Date())}</span></p></div><Link className="button button-primary" to="/alerts">{t('viewAllAlerts')} <ArrowRight size={16} /></Link></div>
      {(alertsError || alertsWarning) && <div className="contact-warning" role="status"><ShieldAlert size={18} /><p><strong>{alertsError ? 'Live alerts unavailable.' : 'Showing cached official alerts.'}</strong> {alertsError || alertsWarning}</p></div>}
      <div className="stat-grid">
        <Stat icon={ShieldAlert} label={t('activeAlerts')} value={active.length} note={mockDataEnabled ? 'Opt-in mock records' : 'SACHET/NDMA source records'} tone="blue" />
        <Stat icon={CloudRain} label={t('criticalAlerts')} value={critical} note="Requires immediate attention" tone="red" highlight={critical > 0} />
        <Stat icon={MapPinned} label={t('statesAffected')} value={states} note="Locations represented" tone="orange" />
        <Stat icon={UsersRound} label={t('communityReports')} value={communityReports?.length ?? '—'} note="Admin-reviewed submissions" tone="green" />
      </div>
      <div className="dashboard-grid">
        <section className="panel alerts-panel"><div className="panel-heading"><div><span className="section-kicker">FIELD PICTURE</span><h2>{t('latestAlerts')}</h2></div><Link to="/alerts" className="text-link">{t('liveAlerts')} <ArrowRight size={15} /></Link></div><div className="alert-stack">{recent.map((alert) => <AlertCard key={alert.alertId} alert={alert} compact />)}</div></section>
        <section className="panel map-panel"><div className="panel-heading"><div><span className="section-kicker">GEOGRAPHIC VIEW</span><h2>{t('indiaSituationMap')}</h2></div><Link to="/map" className="icon-link" aria-label={t('disasterMap')}><ArrowUpRight size={17} /></Link></div><AlertMap alerts={active} className="dashboard-map" /><div className="map-legend compact-legend">{severityData.map((item) => <Legend key={item.name} color={colors[item.name]} label={item.name} />)}</div></section>
        <section className="panel chart-panel"><div className="panel-heading"><div><span className="section-kicker">SEVEN-DAY ACTIVITY</span><h2>{t('alertTrend')}</h2></div><span className="chart-note">From available alert records</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1f6d88" stopOpacity={0.21} /><stop offset="95%" stopColor="#1f6d88" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="#e9edf0" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#83909a', fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#83909a', fontSize: 11 }} /><Tooltip contentStyle={{ border: '1px solid #e4e9ed', borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="alerts" stroke="#1f6d88" strokeWidth={2.5} fill="url(#trendFill)" /></AreaChart></ResponsiveContainer></div></section>
        <section className="panel severity-panel"><div className="panel-heading"><div><span className="section-kicker">CURRENT DISTRIBUTION</span><h2>{t('bySeverity')}</h2></div></div><div className="severity-chart"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityData} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="90%" paddingAngle={4} stroke="none">{severityData.map((entry) => <Cell key={entry.name} fill={colors[entry.name]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{active.length}</strong><span>{t('liveAlerts')}</span></div></div><div className="severity-legend">{severityData.map((row) => <div key={row.name}><span><i style={{ background: colors[row.name] }} />{row.name}</span><strong>{row.value}</strong></div>)}</div></div></section>
      </div>
      <section className="panel community-reports-panel"><div className="panel-heading"><div><span className="section-kicker">{t('communityReports').toUpperCase()}</span><h2>{t('adminReviewed')}</h2></div><span className="chart-note">Separate from official alerts</span></div><p className="muted-copy">Only reports approved by an administrator appear here. These are community submissions, not official SACHET/NDMA alerts or emergency dispatch.</p>{communityReports === null ? <div className="empty-state"><UsersRound size={22} /><strong>Community reports unavailable</strong></div> : communityReports.length ? <div className="community-report-list">{communityReports.map((report) => <article className="community-report-card" key={report._id}><span className="community-report-status">Admin reviewed</span><h3>{report.location || 'Location not provided'} <small>· {report.category}</small></h3><p>{report.text}</p><time>Reviewed {formatTime(report.updatedAt || report.createdAt, locale)}</time></article>)}</div> : <div className="empty-state"><UsersRound size={22} /><strong>No admin-reviewed community reports yet</strong></div>}</section>
      <div className="bottom-line"><span><span className={`status-dot ${!alertsError && (mockDataEnabled || officialAlertFeed === 'connected') ? 'status-online' : ''}`} />{alertsError ? 'SACHET/NDMA API unavailable' : mockDataEnabled ? 'Opt-in mock data' : `SACHET/NDMA feed: ${officialAlertFeed}`}</span></div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, note, tone, highlight }) {
  return <div className={`stat-card stat-${tone} ${highlight ? 'stat-highlight' : ''}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}
function Legend({ color, label }) { return <span className="map-legend-item"><i style={{ background: color }} />{label}</span> }