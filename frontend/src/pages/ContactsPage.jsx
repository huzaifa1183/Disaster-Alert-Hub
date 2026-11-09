import { useState } from 'react'
import { Ambulance, BadgeAlert, Building2, Flame, Headset, MapPin, Phone, Send, ShieldAlert, Waves } from 'lucide-react'
import { request } from '../services/api.js'

const contacts = [
  { category: 'Emergency services', name: 'Integrated emergency response', number: '112', detail: 'General emergency assistance reference', icon: BadgeAlert, tone: 'red' },
  { category: 'Ambulance', name: 'Medical emergency reference', number: '108', detail: 'Ambulance contact reference', icon: Ambulance, tone: 'green' },
  { category: 'Police', name: 'Police assistance reference', number: '100', detail: 'Police contact reference', icon: ShieldAlert, tone: 'blue' },
  { category: 'Fire', name: 'Fire and rescue reference', number: '101', detail: 'Fire service contact reference', icon: Flame, tone: 'orange' },
  { category: 'Disaster management', name: 'State control room', number: '1070', detail: 'State-level disaster response reference', icon: Waves, tone: 'blue' },
  { category: 'District authority', name: 'District emergency control room', number: '1077', detail: 'District-level assistance reference', icon: Building2, tone: 'orange' },
]

export default function ContactsPage() {
  const [form, setForm] = useState({ text: '', location: '', category: 'Unknown' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try { await request('/reports', { method: 'POST', body: JSON.stringify(form) }); setMessage('Report received for demo review. It is not an emergency dispatch.'); setForm({ text: '', location: '', category: 'Unknown' }) }
    catch (error) { setMessage(`${error.message} Make sure the demo API is running.`) }
    finally { setBusy(false) }
  }

  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow"><Phone size={14} /> REFERENCE DIRECTORY</div><h1>Emergency contacts</h1><p>Useful reference numbers and a demo community report form.</p></div></div>
    <div className="contact-warning"><ShieldAlert size={18} /><p><strong>Verify before relying on a number.</strong> This student demo is not connected to emergency dispatch. Contact details below are reference information and may change; confirm locally. For immediate danger, use verified local emergency channels.</p></div>
    <div className="contact-grid">{contacts.map(({ category, name, number, detail, icon: Icon, tone }) => <article className="contact-card" key={category}><span className={`contact-icon contact-${tone}`}><Icon size={19} /></span><div><span className="section-kicker">{category}</span><h2>{name}</h2><p>{detail}</p></div><a href={`tel:${number}`} className="contact-number"><Phone size={16} /> {number}</a></article>)}</div>
    <section className="panel report-panel"><div className="report-intro"><span className="report-icon"><Headset size={20} /></span><div><span className="section-kicker">DEMO SUBMISSION</span><h2>Share a community report</h2><p>Reports are stored for this project demo only. This form is not monitored by emergency services.</p></div></div><form className="report-form" onSubmit={submit}><label>What did you observe?<textarea required minLength="10" maxLength="2000" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Describe what happened, when and any immediate concern…" /></label><div className="report-fields"><label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="City, district or landmark" /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['Unknown', 'Flood', 'Heavy Rain', 'Cyclone', 'Thunderstorm', 'Heatwave', 'Lightning', 'Earthquake', 'Landslide', 'Tsunami', 'Strong Winds'].map((item) => <option key={item}>{item}</option>)}</select></label><button className="button button-primary" disabled={busy}><Send size={15} /> {busy ? 'Submitting…' : 'Submit demo report'}</button></div>{message && <p className="form-message" role="status">{message}</p>}</form></section>
  </div>
}