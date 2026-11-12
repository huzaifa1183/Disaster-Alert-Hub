import { useMemo, useState } from 'react'
import { MapPinned } from 'lucide-react'
import { useAlerts } from '../App.jsx'
import AlertMap from '../components/AlertMap.jsx'

export default function MapPage() {
  const { alerts, mockDataEnabled } = useAlerts()
  const [disaster, setDisaster] = useState('All types')
  const [severity, setSeverity] = useState('All levels')
  const [state, setState] = useState('All states')
  const [verification, setVerification] = useState('Any status')
  const [date, setDate] = useState('Any time')
  const states = [...new Set(alerts.map((alert) => alert.state))].sort()
  const types = [...new Set(alerts.map((alert) => alert.disasterType))].sort()
  const filtered = useMemo(() => {
    const cutoff = date === '24 hours' ? Date.now() - 86400000 : date === '7 days' ? Date.now() - 604800000 : 0
    return alerts.filter((alert) => (disaster === 'All types' || alert.disasterType === disaster) && (severity === 'All levels' || alert.severity === severity) && (state === 'All states' || alert.state === state) && (verification === 'Any status' || alert.verificationStatus === verification) && new Date(alert.timestamp).getTime() >= cutoff)
  }, [alerts, disaster, severity, state, verification, date])
  return <div className="page-enter map-page"><div className="page-heading"><div><div className="eyebrow"><MapPinned size={14} /> GEOSPATIAL MONITOR</div><h1>Disaster map</h1><p>Only locations from connected alert records appear here.</p></div><span className="map-count"><i /> {filtered.length} ALERT LOCATIONS</span></div>
    {!mockDataEnabled && <div className="contact-warning" role="status"><strong>No official feed connected.</strong> SACHET/NDMA alerts are not connected, so the map has no official alert markers.</div>}
    <div className="map-filter-bar"><Filter label="Disaster type" value={disaster} onChange={setDisaster} options={['All types', ...types]} /><Filter label="Severity" value={severity} onChange={setSeverity} options={['All levels', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']} /><Filter label="State" value={state} onChange={setState} options={['All states', ...states]} /><Filter label="Verification" value={verification} onChange={setVerification} options={['Any status', 'Verified', 'Unconfirmed', 'Conflicting']} /><Filter label="Date" value={date} onChange={setDate} options={['Any time', '24 hours', '7 days']} /></div>
    <AlertMap alerts={filtered} className="full-map" />
    <div className="full-map-legend"><strong>SEVERITY</strong>{[['#d63f3f', 'Critical'], ['#ed8a31', 'High'], ['#d1a52e', 'Medium'], ['#2f8d71', 'Low']].map(([color, label]) => <span key={label}><i style={{ background: color }} />{label}</span>)}<span className="legend-note">Map tiles by OpenStreetMap</span></div>
  </div>
}
function Filter({ label, value, onChange, options }) { return <label className="map-filter"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label> }