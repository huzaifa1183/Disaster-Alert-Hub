import { useMemo, useState } from 'react'
import { MapPinned } from 'lucide-react'
import { useAlerts } from '../App.jsx'
import AlertMap from '../components/AlertMap.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

export default function MapPage() {
  const { t } = useLanguage()
  const { alerts, alertsError, alertsWarning } = useAlerts()
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
  return <div className="page-enter map-page"><div className="page-heading"><div><div className="eyebrow"><MapPinned size={14} /> {t('disasterMap').toUpperCase()}</div><h1>{t('disasterMap')}</h1><p>Only locations from connected alert records appear here.</p></div><span className="map-count"><i /> {filtered.length} ALERT LOCATIONS · OFFICIAL FEED</span></div>
    {(alertsError || alertsWarning) && <div className="contact-warning" role="status"><strong>{alertsError ? 'Live alerts unavailable.' : 'Showing cached official alerts.'}</strong> {alertsError || alertsWarning}</div>}
    <div className="map-filter-bar"><Filter label={t('disaster')} value={disaster} onChange={setDisaster} options={[[t('allTypes'), 'All types'], ...types.map((item) => [item, item])]} /><Filter label={t('severity')} value={severity} onChange={setSeverity} options={[[t('allLevels'), 'All levels'], ...['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].map((item) => [item, item])]} /><Filter label={t('state')} value={state} onChange={setState} options={[[t('allStates'), 'All states'], ...states.map((item) => [item, item])]} /><Filter label={t('verification')} value={verification} onChange={setVerification} options={[[t('anyStatus'), 'Any status'], ...['Verified', 'Unconfirmed', 'Conflicting'].map((item) => [item, item])]} /><Filter label={t('date')} value={date} onChange={setDate} options={[[t('anyTime'), 'Any time'], [t('hours24'), '24 hours'], [t('days7'), '7 days']]} /></div>
    <AlertMap alerts={filtered} className="full-map" />
    <div className="full-map-legend"><strong>SEVERITY</strong>{[['#d63f3f', 'Critical'], ['#ed8a31', 'High'], ['#d1a52e', 'Medium'], ['#2f8d71', 'Low'], ['#718096', 'Unknown']].map(([color, label]) => <span key={label}><i style={{ background: color }} />{label}</span>)}<span className="legend-note">Map tiles by OpenStreetMap</span></div>
  </div>
}
function Filter({ label, value, onChange, options }) { return <label className="map-filter"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([text, optionValue]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label> }