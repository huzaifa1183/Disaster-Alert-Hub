import { useEffect, useState } from 'react'
import { ArrowLeft, BadgeCheck, Clock3, Crosshair, MapPin, MessageCircle, Radio, Shield, ShieldAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAlerts } from '../App.jsx'
import AlertCard, { SeverityPill } from '../components/AlertCard.jsx'
import { request } from '../services/api.js'
import { formatTime } from '../utils/format.js'

export default function AlertDetail() {
  const { id } = useParams()
  const { alerts, setChatOpen, setChatPrompt } = useAlerts()
  const [alert, setAlert] = useState(alerts.find((item) => item.alertId === id || item._id === id))
  useEffect(() => {
    const current = alerts.find((item) => item.alertId === id || item._id === id)
    if (current) setAlert(current)
    else request(`/alerts/${encodeURIComponent(id)}`).then(setAlert).catch(() => setAlert(null))
  }, [id, alerts])

  if (!alert) return <div className="empty-state"><ShieldAlert size={26} /><strong>Alert not found</strong><Link to="/alerts" className="text-link">Return to alert register</Link></div>
  const related = alerts.filter((item) => item.alertId !== alert.alertId && (item.disasterType === alert.disasterType || item.state === alert.state)).slice(0, 3)
  return <div className="page-enter"><Link to="/alerts" className="back-link"><ArrowLeft size={15} /> Back to alerts</Link><div className="detail-layout"><div className="detail-main"><div className="detail-banner"><div className="eyebrow"><Radio size={13} /> DEMO ALERT RECORD <span>·</span> {alert.alertId}</div><div className="detail-title-line"><div><span className="type-label">{alert.disasterType}</span><h1>{alert.title}</h1></div><SeverityPill severity={alert.severity} /></div><div className="detail-loc"><MapPin size={16} /> {alert.city}, {alert.district}, {alert.state}</div><button className="button button-ai-ask" onClick={() => { setChatPrompt({ message: 'Explain this alert to me.', alertId: alert.alertId }); setChatOpen(true) }}><MessageCircle size={15} /> Ask AI about this alert</button></div>
      <section className="panel detail-section"><div className="panel-heading"><div><span className="section-kicker">SITUATION REPORT</span><h2>What we know</h2></div><span className={`verify-badge ${alert.verificationStatus === 'Verified' ? 'is-verified' : ''}`}>{alert.verificationStatus === 'Verified' ? <BadgeCheck size={15} /> : <Clock3 size={15} />}{alert.verificationStatus}</span></div><p className="detail-description">{alert.description}</p><div className="detail-facts"><Fact label="Reported" value={formatTime(alert.timestamp)} /><Fact label="Source" value={alert.source} /><Fact label="Affected area" value={alert.affectedArea || 'Not specified'} /><Fact label="Confidence" value={`${Math.round(Number(alert.confidenceScore) * 100)}%`} /><Fact label="Coordinates" value={`${Number(alert.latitude).toFixed(4)}, ${Number(alert.longitude).toFixed(4)}`} /></div></section>
      <section className="panel detail-section safety-section"><div className="panel-heading"><div><span className="section-kicker">PREPAREDNESS</span><h2>Safety instructions</h2></div><span className="safety-icon"><Shield size={17} /></span></div><ul className="safety-list">{(alert.safetyInstructions || []).map((item) => <li key={item}>{item}</li>)}</ul><p className="inline-disclaimer">General preparedness information only. In a real emergency, follow verified local authority instructions.</p></section>
      <section className="panel detail-section"><div className="panel-heading"><div><span className="section-kicker">EVENT HISTORY</span><h2>Alert timeline</h2></div><span className="chart-note">Demo sequence</span></div><div className="timeline"><TimelineItem time={formatTime(alert.timestamp)} title="Demo notice created" body={`Source recorded as ${alert.source}.`} /><TimelineItem time={formatTime(new Date(new Date(alert.timestamp).getTime() + 6 * 60 * 1000))} title={alert.verificationStatus === 'Verified' ? 'Record marked verified' : 'Verification pending'} body="Status shown for project demonstration; not an official assessment." /><TimelineItem time="Current status" title="Notice available in demo hub" body="Subscribe to live sync to receive admin-created changes." last /></div></section>
      </div><aside className="detail-aside"><div className="panel coordinate-card"><div className="section-kicker">LOCATION</div><div className="coordinate-number"><Crosshair size={16} /> {Number(alert.latitude).toFixed(3)}° N, {Number(alert.longitude).toFixed(3)}° E</div><Link className="text-link" to="/map">View on map ↗</Link></div><div className="aside-related"><div className="panel-heading"><div><span className="section-kicker">NEARBY SIGNALS</span><h2>Related alerts</h2></div></div>{related.length ? related.map((item) => <AlertCard key={item.alertId} alert={item} compact />) : <p className="muted-copy">No related demo notices.</p>}</div></aside></div></div>
}
function Fact({ label, value }) { return <div className="detail-fact"><span>{label}</span><strong>{value}</strong></div> }
function TimelineItem({ time, title, body, last }) { return <div className={`timeline-item ${last ? 'timeline-last' : ''}`}><span className="timeline-marker" /><div><time>{time}</time><strong>{title}</strong><p>{body}</p></div></div> }