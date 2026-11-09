import { ArrowUpRight, BadgeCheck, Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatTime, relativeTime } from '../utils/format.js'

export function SeverityPill({ severity }) {
  return <span className={`severity-pill severity-${severity?.toLowerCase()}`}>{severity}</span>
}

export default function AlertCard({ alert, compact = false }) {
  return (
    <article className={`alert-card ${compact ? 'alert-card-compact' : ''}`}>
      <div className={`alert-edge edge-${alert.severity?.toLowerCase()}`} />
      <div className="alert-card-main">
        <div className="alert-card-top"><span className="type-label">{alert.disasterType}</span><SeverityPill severity={alert.severity} /></div>
        <Link className="alert-title" to={`/alerts/${alert.alertId}`}>{alert.title}</Link>
        <div className="alert-location"><MapPin size={14} /><span>{alert.city || alert.district}, {alert.state}</span></div>
        {!compact && <p className="alert-description">{alert.description}</p>}
        <div className="alert-meta"><span title={formatTime(alert.timestamp)}><Clock3 size={13} />{relativeTime(alert.timestamp)}</span><span>{alert.alertId}</span><span className={alert.verificationStatus === 'Verified' ? 'verified-text' : 'pending-text'}>{alert.verificationStatus === 'Verified' ? <BadgeCheck size={13} /> : <span className="tiny-dot" />}{alert.verificationStatus}</span><Link className="alert-open" to={`/alerts/${alert.alertId}`} aria-label={`Open ${alert.title}`}><ArrowUpRight size={17} /></Link></div>
      </div>
    </article>
  )
}