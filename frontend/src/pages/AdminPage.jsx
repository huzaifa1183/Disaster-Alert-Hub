import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BadgeCheck, BarChart3, Check, CircleAlert, ClipboardList, FilePlus2, LogOut, Pencil, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import { useAlerts } from '../App.jsx'
import { SeverityPill } from '../components/AlertCard.jsx'
import { request } from '../services/api.js'
import { formatTime } from '../utils/format.js'

const categories = ['Flood', 'Heavy Rain', 'Cyclone', 'Thunderstorm', 'Heatwave', 'Lightning', 'Earthquake', 'Landslide', 'Tsunami', 'Strong Winds']
const blankForm = { alertId: '', title: '', disasterType: 'Flood', severity: 'MEDIUM', state: '', district: '', city: '', latitude: '', longitude: '', description: '', source: 'Demo Operations Desk', timestamp: new Date().toISOString().slice(0, 16), verificationStatus: 'Pending', confidenceScore: '0.75', affectedArea: '', safetyText: '' }

export default function AdminPage() {
  const { alerts, refreshAlerts } = useAlerts()
  const [token, setToken] = useState(localStorage.getItem('dah-token') || '')
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [categoryRows, setCategoryRows] = useState(categories.map((name) => ({ _id: name, name, description: '' })))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadAdminData = async (activeToken = token) => {
    const headers = { token: activeToken }
    try {
      const [dashboard, reportRows, userRows, disasterRows] = await Promise.all([request('/admin/dashboard', headers), request('/reports', headers), request('/admin/users', headers), request('/disasters', headers)])
      setStats(dashboard); setReports(reportRows); setUsers(userRows); setCategoryRows(disasterRows); setError('')
    } catch (reason) { setError(reason.message); if (reason.message.includes('Authentication') || reason.message.includes('Session')) signOut() }
  }

  useEffect(() => {
    if (token) {
      try { setUser(JSON.parse(localStorage.getItem('dah-user') || 'null')) } catch { setUser(null) }
      loadAdminData(token)
    }
  }, [token])

  const signIn = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    const formData = new FormData(event.currentTarget)
    try {
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') }) })
      localStorage.setItem('dah-token', result.token); localStorage.setItem('dah-user', JSON.stringify(result.user)); setUser(result.user); setToken(result.token); setNotice('Signed in to the demo administration panel.')
    } catch (reason) { setError(`${reason.message} Start the backend API, then use the demo credentials shown below.`) }
    finally { setBusy(false) }
  }
  const signOut = () => { localStorage.removeItem('dah-token'); localStorage.removeItem('dah-user'); setToken(''); setUser(null); setStats(null) }

  const saveAlert = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    const payload = { ...form, timestamp: new Date(form.timestamp).toISOString(), latitude: Number(form.latitude), longitude: Number(form.longitude), confidenceScore: Number(form.confidenceScore), safetyInstructions: form.safetyText.split('\n').map((line) => line.trim()).filter(Boolean) }
    delete payload.safetyText
    try {
      await request(form._id ? `/alerts/${encodeURIComponent(form.alertId)}` : '/alerts', { method: form._id ? 'PUT' : 'POST', token, body: JSON.stringify(payload) })
      setNotice(form._id ? 'Alert updated.' : 'Alert created and distributed to connected demo clients.')
      setForm(null); await refreshAlerts(); await loadAdminData(token)
    } catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  const editAlert = (alert) => setForm({ ...blankForm, ...alert, timestamp: new Date(alert.timestamp).toISOString().slice(0, 16), confidenceScore: String(alert.confidenceScore), safetyText: (alert.safetyInstructions || []).join('\n') })
  const verifyAlert = async (alert, verified) => {
    try { await request(`/admin/alerts/${encodeURIComponent(alert.alertId)}/verify`, { method: 'PUT', token, body: JSON.stringify({ verified }) }); setNotice(`Alert marked ${verified ? 'verified' : 'unverified'}.`); await refreshAlerts() }
    catch (reason) { setError(reason.message) }
  }
  const deleteAlert = async (alert) => {
    if (!window.confirm(`Delete demo alert ${alert.alertId}?`)) return
    try { await request(`/alerts/${encodeURIComponent(alert.alertId)}`, { method: 'DELETE', token }); setNotice('Alert deleted.'); await refreshAlerts(); await loadAdminData(token) }
    catch (reason) { setError(reason.message) }
  }
  const updateUserRole = async (person, role) => {
    try { await request(`/admin/users/${encodeURIComponent(person._id)}/role`, { method: 'PUT', token, body: JSON.stringify({ role }) }); setNotice(`${person.email} role updated.`); await loadAdminData(token) }
    catch (reason) { setError(reason.message) }
  }
  const deleteUser = async (person) => {
    if (!window.confirm(`Remove user ${person.email}?`)) return
    try { await request(`/admin/users/${encodeURIComponent(person._id)}`, { method: 'DELETE', token }); setNotice('User removed.'); await loadAdminData(token) }
    catch (reason) { setError(reason.message) }
  }
  const addCategory = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const data = new FormData(formElement)
    try { await request('/disasters', { method: 'POST', token, body: JSON.stringify({ name: data.get('categoryName'), description: data.get('categoryDescription') || '' }) }); setNotice('Disaster category added.'); formElement.reset(); await loadAdminData(token) }
    catch (reason) { setError(reason.message) }
  }
  const editCategory = async (category) => {
    const name = window.prompt('Category name', category.name)
    if (!name?.trim() || name.trim() === category.name) return
    try { await request(`/disasters/${encodeURIComponent(category._id)}`, { method: 'PUT', token, body: JSON.stringify({ name: name.trim() }) }); setNotice('Disaster category updated.'); await loadAdminData(token) }
    catch (reason) { setError(reason.message) }
  }
  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete category ${category.name}? Existing alert records are not changed.`)) return
    try { await request(`/disasters/${encodeURIComponent(category._id)}`, { method: 'DELETE', token }); setNotice('Disaster category deleted.'); await loadAdminData(token) }
    catch (reason) { setError(reason.message) }
  }

  const typeData = useMemo(() => categories.map((name) => ({ name, count: alerts.filter((alert) => alert.disasterType === name).length })).filter((row) => row.count), [alerts])
  const stateData = useMemo(() => Object.values(alerts.reduce((acc, alert) => { acc[alert.state] ||= { state: alert.state, count: 0 }; acc[alert.state].count += 1; return acc }, {})).sort((a, b) => b.count - a.count).slice(0, 8), [alerts])

  if (!token) return <div className="admin-login-wrap page-enter"><div className="admin-login-art"><span className="admin-art-kicker"><Activity size={15} /> DISASTER ALERT HUB</span><h1>Operations<br />control room.</h1><p>A secure demo workspace for managing alert records and reviewing reports.</p><div className="admin-art-grid"><span>01 / ALERTS</span><span>02 / VERIFICATION</span><span>03 / ANALYTICS</span></div></div><div className="admin-login panel"><span className="admin-login-icon"><ShieldCheck size={22} /></span><span className="section-kicker">ADMINISTRATION</span><h2>Sign in</h2><p>Use the project demo account to continue.</p><form onSubmit={signIn}><label>Email address<input name="email" type="email" required defaultValue="admin@demo.com" autoComplete="username" /></label><label>Password<input name="password" type="password" required defaultValue="DemoAdmin123!" autoComplete="current-password" /></label><button className="button button-primary button-wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to dashboard'}</button></form>{error && <p className="form-error" role="alert">{error}</p>}<div className="demo-credentials"><span>DEMO ACCESS</span><strong>admin@demo.com</strong><strong>DemoAdmin123!</strong></div><p className="login-disclaimer">Demo credentials only. Change defaults and JWT secret before deployment.</p></div></div>

  const tabs = [{ name: 'Overview', icon: BarChart3 }, { name: 'Alerts', icon: ClipboardList }, { name: 'Reports', icon: CircleAlert }, { name: 'Users', icon: Users }, { name: 'Categories', icon: Activity }]
  return <div className="page-enter admin-page"><div className="page-heading admin-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> ADMIN CONTROL ROOM</div><h1>Operations dashboard</h1><p>Signed in as {user?.name || user?.email || 'Demo administrator'} <span className="date-stamp">· DEMO ENVIRONMENT</span></p></div><button className="button button-secondary" onClick={signOut}><LogOut size={15} /> Sign out</button></div>
    {notice && <div className="admin-notice"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}{error && <div className="admin-error"><CircleAlert size={16} />{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button></div>}
    <div className="admin-tabs" role="tablist">{tabs.map(({ name, icon: Icon }) => <button key={name} className={tab === name ? 'admin-tab active' : 'admin-tab'} onClick={() => { setTab(name); setForm(null) }} role="tab" aria-selected={tab === name}><Icon size={16} />{name}{name === 'Reports' && reports.filter((report) => report.status === 'Pending').length > 0 && <i>{reports.filter((report) => report.status === 'Pending').length}</i>}</button>)}</div>
    {tab === 'Overview' && <><div className="admin-stat-grid">{[[ClipboardList, 'Total alerts', stats?.totalAlerts ?? alerts.length], [Activity, 'Active alerts', stats?.activeAlerts ?? alerts.length], [BadgeCheck, 'Verified alerts', stats?.verifiedAlerts ?? alerts.filter((item) => item.verificationStatus === 'Verified').length], [CircleAlert, 'Pending reports', stats?.pendingReports ?? reports.length], [ShieldCheck, 'Critical alerts', stats?.criticalAlerts ?? alerts.filter((item) => item.severity === 'CRITICAL').length]].map(([Icon, label, value]) => <div className="admin-stat" key={label}><Icon size={17} /><span>{label}</span><strong>{value}</strong></div>)}</div><div className="admin-chart-grid"><section className="panel"><div className="panel-heading"><div><span className="section-kicker">DISTRIBUTION</span><h2>Alerts by state</h2></div></div><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={stateData} layout="vertical" margin={{ top: 2, right: 12, left: 8, bottom: 2 }}><CartesianGrid stroke="#ebeff2" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fill: '#83909a', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="state" width={112} tick={{ fill: '#667681', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="count" fill="#1f6d88" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></section><section className="panel"><div className="panel-heading"><div><span className="section-kicker">HAZARD TYPES</span><h2>Alerts by disaster</h2></div></div><div className="admin-pie-row"><div className="admin-pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={typeData} dataKey="count" nameKey="name" innerRadius="61%" outerRadius="88%" paddingAngle={2}><Cell fill="#d63f3f" /><Cell fill="#ed8a31" /><Cell fill="#1f6d88" /><Cell fill="#d1a52e" /><Cell fill="#2f8d71" /><Cell fill="#68a9b5" /><Cell fill="#8598a3" /><Cell fill="#bd7461" /></Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="admin-type-list">{typeData.slice(0, 5).map((item) => <div key={item.name}><span>{item.name}</span><strong>{item.count}</strong></div>)}</div></div></section></div><section className="panel admin-table-panel"><div className="panel-heading"><div><span className="section-kicker">LATEST RECORDS</span><h2>Recent alerts</h2></div><button className="text-link" onClick={() => setTab('Alerts')}>Manage alerts →</button></div><AlertTable alerts={alerts.slice(0, 5)} onEdit={editAlert} onVerify={verifyAlert} onDelete={deleteAlert} /></section></>}
    {tab === 'Alerts' && <section className="panel admin-table-panel"><div className="panel-heading"><div><span className="section-kicker">RECORD MANAGEMENT</span><h2>{form ? (form._id ? 'Edit alert' : 'Create alert') : 'Alert records'}</h2></div>{!form && <button className="button button-primary" onClick={() => setForm({ ...blankForm, alertId: `DAH-${Date.now().toString().slice(-9)}` })}><FilePlus2 size={16} /> Create alert</button>}</div>{form ? <AlertForm form={form} setForm={setForm} onSubmit={saveAlert} busy={busy} onCancel={() => setForm(null)} categories={categoryRows} /> : <AlertTable alerts={alerts} onEdit={editAlert} onVerify={verifyAlert} onDelete={deleteAlert} />}</section>}
    {tab === 'Reports' && <section className="panel admin-table-panel"><div className="panel-heading"><div><span className="section-kicker">CITIZEN SUBMISSIONS</span><h2>Incoming reports</h2></div><span className="chart-note">{reports.length} reports</span></div>{reports.length ? <div className="report-list">{reports.map((report) => <article className="report-row" key={report._id}><span className="report-row-icon"><CircleAlert size={17} /></span><div><strong>{report.location || 'Location not provided'} <small>· {report.category}</small></strong><p>{report.text}</p><span>{formatTime(report.createdAt)} · {report.source || 'Citizen report'}</span></div><span className="report-status">{report.status}</span></article>)}</div> : <div className="empty-state"><ClipboardList size={24} /><strong>No reports yet</strong><span>Community demo submissions will appear here.</span></div>}</section>}
    {tab === 'Users' && <section className="panel admin-table-panel"><div className="panel-heading"><div><span className="section-kicker">ACCESS DIRECTORY</span><h2>Registered users</h2></div><span className="chart-note">{users.length} accounts</span></div>{users.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{users.map((person) => <tr key={person._id}><td>{person.name}</td><td>{person.email}</td><td><select aria-label={`Role for ${person.email}`} className="role-select" value={person.role} onChange={(event) => updateUserRole(person, event.target.value)}><option value="user">user</option><option value="admin">admin</option></select></td><td>{person.createdAt ? formatTime(person.createdAt) : 'Demo account'}</td><td><div className="table-actions"><button title="Remove user" className="action-delete" onClick={() => deleteUser(person)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><Users size={24} /><strong>No user records</strong></div>}</section>}
    {tab === 'Categories' && <section className="panel admin-table-panel"><div className="panel-heading"><div><span className="section-kicker">CLASSIFICATION</span><h2>Disaster categories</h2></div><span className="chart-note">{categoryRows.length} types</span></div><form className="category-create-form" onSubmit={addCategory}><input name="categoryName" required minLength="2" maxLength="60" placeholder="New category name" /><input name="categoryDescription" maxLength="400" placeholder="Description (optional)" /><button className="button button-primary"><FilePlus2 size={15} /> Add category</button></form><div className="category-admin-grid">{categoryRows.map((category, index) => <div key={category._id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{category.name}</strong><small>{alerts.filter((alert) => alert.disasterType === category.name).length} alerts in dataset</small><div className="category-actions"><button onClick={() => editCategory(category)} aria-label={`Rename ${category.name}`}><Pencil size={13} /></button><button onClick={() => deleteCategory(category)} aria-label={`Delete ${category.name}`}><Trash2 size={13} /></button></div></div>)}</div></section>}
  </div>
}

function AlertTable({ alerts, onEdit, onVerify, onDelete }) {
  return <div className="table-scroll"><table className="admin-table"><thead><tr><th>Alert</th><th>Location</th><th>Severity</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{alerts.map((alert) => <tr key={alert.alertId}><td><strong>{alert.title}</strong><small>{alert.alertId} · {alert.disasterType}</small></td><td>{alert.city}, {alert.state}</td><td><SeverityPill severity={alert.severity} /></td><td><span className={alert.verificationStatus === 'Verified' ? 'table-verified' : 'table-pending'}>{alert.verificationStatus}</span></td><td>{formatTime(alert.timestamp)}</td><td><div className="table-actions"><button title="Edit alert" onClick={() => onEdit(alert)}><Pencil size={15} /></button><button title={alert.verificationStatus === 'Verified' ? 'Mark unverified' : 'Verify alert'} onClick={() => onVerify(alert, alert.verificationStatus !== 'Verified')}><Check size={16} /></button><button className="action-delete" title="Delete alert" onClick={() => onDelete(alert)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
}

function AlertForm({ form, setForm, onSubmit, busy, onCancel, categories: categoryOptions }) {
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  return <form className="alert-admin-form" onSubmit={onSubmit}><div className="form-grid"><Field label="Alert ID"><input name="alertId" value={form.alertId} onChange={change} required maxLength="40" /></Field><Field label="Title"><input name="title" value={form.title} onChange={change} required maxLength="160" /></Field><Field label="Disaster type"><select name="disasterType" value={form.disasterType} onChange={change}>{categoryOptions.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}</select></Field><Field label="Severity"><select name="severity" value={form.severity} onChange={change}>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="State"><input name="state" value={form.state} onChange={change} required /></Field><Field label="District"><input name="district" value={form.district} onChange={change} required /></Field><Field label="City"><input name="city" value={form.city} onChange={change} /></Field><Field label="Date and time"><input type="datetime-local" name="timestamp" value={form.timestamp} onChange={change} required /></Field><Field label="Latitude"><input type="number" step="any" min="-90" max="90" name="latitude" value={form.latitude} onChange={change} required /></Field><Field label="Longitude"><input type="number" step="any" min="-180" max="180" name="longitude" value={form.longitude} onChange={change} required /></Field><Field label="Source"><input name="source" value={form.source} onChange={change} required /></Field><Field label="Confidence score (0–1)"><input type="number" step="0.01" min="0" max="1" name="confidenceScore" value={form.confidenceScore} onChange={change} required /></Field><Field label="Verification status"><select name="verificationStatus" value={form.verificationStatus} onChange={change}>{['Pending', 'Verified', 'Unverified'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Affected area"><input name="affectedArea" value={form.affectedArea} onChange={change} /></Field><Field label="Description" wide><textarea name="description" value={form.description} onChange={change} required minLength="10" maxLength="2000" rows="3" /></Field><Field label="Safety instructions (one per line)" wide><textarea name="safetyText" value={form.safetyText} onChange={change} rows="3" placeholder="Move to a safe area…" /></Field></div><div className="form-actions"><p>Only demo data should be entered. Creating a critical record notifies connected demo clients.</p><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : form._id ? 'Save changes' : 'Publish alert'}</button></div></form>
}
function Field({ label, children, wide }) { return <label className={`admin-field ${wide ? 'field-wide' : ''}`}><span>{label}</span>{children}</label> }