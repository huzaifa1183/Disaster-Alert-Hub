import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, ListFilter, Search, SlidersHorizontal } from 'lucide-react'
import { useAlerts } from '../App.jsx'
import AlertCard from '../components/AlertCard.jsx'

export default function AlertsPage() {
  const { alerts, alertsError, mockDataEnabled } = useAlerts()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('search') || '')
  const [type, setType] = useState('All types')
  const [severity, setSeverity] = useState('All levels')
  const [state, setState] = useState('All states')
  const [verification, setVerification] = useState('Any status')
  const [range, setRange] = useState('Any time')
  const stateList = [...new Set(alerts.map((alert) => alert.state))].sort()
  const types = [...new Set(alerts.map((alert) => alert.disasterType))].sort()
  const filtered = useMemo(() => {
    const cutoff = range === '24 hours' ? Date.now() - 86400000 : range === '7 days' ? Date.now() - 604800000 : 0
    const needle = query.toLowerCase().trim()
    return alerts.filter((alert) => {
      const matchesText = !needle || [alert.alertId, alert.title, alert.disasterType, alert.state, alert.district, alert.city].join(' ').toLowerCase().includes(needle)
      return matchesText && (type === 'All types' || alert.disasterType === type) && (severity === 'All levels' || alert.severity === severity) && (state === 'All states' || alert.state === state) && (verification === 'Any status' || alert.verificationStatus === verification) && new Date(alert.timestamp).getTime() >= cutoff
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [alerts, query, type, severity, state, verification, range])

  const updateQuery = (value) => { setQuery(value); setParams(value ? { search: value } : {}) }
  const exportCsv = () => {
    const columns = ['alertId', 'title', 'disasterType', 'severity', 'city', 'district', 'state', 'timestamp', 'verificationStatus']
    const csv = [columns.join(','), ...filtered.map((alert) => columns.map((key) => `"${String(alert[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); anchor.download = 'disaster-alert-hub-alerts.csv'; anchor.click(); URL.revokeObjectURL(anchor.href)
  }

  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow"><ListFilter size={14} /> ALERT REGISTER</div><h1>Live alerts</h1><p>Only connected alert sources are shown; community reports are not official alerts.</p></div><button className="button button-secondary" onClick={exportCsv} disabled={!filtered.length}><Download size={16} /> Export CSV</button></div>
    {!mockDataEnabled && <div className="contact-warning" role="status"><strong>{alertsError ? 'Live alerts unavailable.' : 'No official feed connected.'}</strong> {alertsError || 'SACHET/NDMA alerts are not connected. No official alerts are displayed.'}</div>}
    <div className="filters-panel"><div className="filter-search"><Search size={16} /><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Search alert, city, district or ID" /></div><div className="filter-controls"><Filter label="Disaster"><select value={type} onChange={(event) => setType(event.target.value)}><option>All types</option>{types.map((item) => <option key={item}>{item}</option>)}</select></Filter><Filter label="Severity"><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>All levels</option>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((item) => <option key={item}>{item}</option>)}</select></Filter><Filter label="State"><select value={state} onChange={(event) => setState(event.target.value)}><option>All states</option>{stateList.map((item) => <option key={item}>{item}</option>)}</select></Filter><Filter label="Verification"><select value={verification} onChange={(event) => setVerification(event.target.value)}><option>Any status</option><option>Verified</option><option>Unconfirmed</option><option>Conflicting</option></select></Filter><Filter label="Date"><select value={range} onChange={(event) => setRange(event.target.value)}><option>Any time</option><option>24 hours</option><option>7 days</option></select></Filter></div></div>
    <div className="results-line"><span><strong>{filtered.length}</strong> of {alerts.length} notices</span><span><SlidersHorizontal size={14} /> {mockDataEnabled ? 'Mock data enabled' : 'Official alert feed not connected'}</span></div>
    {filtered.length ? <div className="alert-list-grid">{filtered.map((alert) => <AlertCard key={alert.alertId} alert={alert} />)}</div> : <div className="empty-state"><Search size={25} /><strong>{alertsError ? 'Live alerts unavailable' : mockDataEnabled ? 'No mock alerts match these filters' : 'No official feed connected'}</strong><span>{alertsError || (mockDataEnabled ? 'Try another keyword or reset a filter.' : 'SACHET/NDMA alerts are not connected. No alerts are shown.')}</span>{(query || type !== 'All types' || severity !== 'All levels' || state !== 'All states' || verification !== 'Any status' || range !== 'Any time') && <button className="button button-secondary" onClick={() => { setType('All types'); setSeverity('All levels'); setState('All states'); setVerification('Any status'); setRange('Any time'); updateQuery('') }}>Clear filters</button>}</div>}
  </div>
}

function Filter({ label, children }) { return <label className="filter-control"><span>{label}</span>{children}</label> }