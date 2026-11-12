import { useState } from 'react'
import { Headset, Phone, Send, ShieldAlert } from 'lucide-react'
import { request } from '../services/api.js'

export default function ContactsPage() {
  const [form, setForm] = useState({ text: '', location: '', category: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try { await request('/reports', { method: 'POST', body: JSON.stringify(form) }); setMessage('Community report received. It is unverified and is not an emergency dispatch.'); setForm({ text: '', location: '', category: '' }) }
    catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }

  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow"><Phone size={14} /> COMMUNITY REPORTS</div><h1>Contacts &amp; reports</h1><p>No official emergency directory or dispatch connection is available in this app.</p></div></div>
    <div className="contact-warning"><ShieldAlert size={18} /><p><strong>Official directory not connected.</strong> No emergency numbers are published here because this app does not have a verified government contact source. This app supplements, and does not replace, official government warnings.</p></div>
    <section className="panel report-panel"><div className="report-intro"><span className="report-icon"><Headset size={20} /></span><div><span className="section-kicker">UNVERIFIED SUBMISSION</span><h2>Share a community report</h2><p>Reports are user-submitted, are not verified alerts, and are not monitored by emergency services.</p></div></div><form className="report-form" onSubmit={submit}><label>What did you observe?<textarea required minLength="10" maxLength="2000" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Describe your observation…" /></label><div className="report-fields"><label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="City, district or landmark" /></label><label>Category (optional)<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} maxLength="80" placeholder="Describe the event type" /></label><button className="button button-primary" disabled={busy}><Send size={15} /> {busy ? 'Submitting…' : 'Submit community report'}</button></div>{message && <p className="form-message" role="status">{message}</p>}</form></section>
  </div>
}