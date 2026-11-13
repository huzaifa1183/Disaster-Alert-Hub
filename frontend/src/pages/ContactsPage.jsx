import { useState } from 'react'
import { Headset, Phone, Send, ShieldAlert } from 'lucide-react'
import { request } from '../services/api.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const emergencyContacts = [
  {
    number: '112',
    title: 'Integrated emergency response',
    scope: 'Nationwide · Primary number',
    description: 'Police, fire and rescue, medical help, or another immediate emergency.',
    tone: 'contact-red',
    officialUrl: 'https://112.gov.in/',
  },
  {
    number: '100',
    title: 'Police',
    scope: 'Police helpline',
    description: 'Direct police assistance. Call 112 if this number does not connect.',
    tone: 'contact-blue',
  },
  {
    number: '101',
    title: 'Fire and rescue',
    scope: 'Fire service',
    description: 'Report a fire or request fire and rescue assistance.',
    tone: 'contact-orange',
  },
  {
    number: '108',
    title: 'Emergency ambulance',
    scope: 'Availability varies by state',
    description: 'Ambulance response in participating areas. For urgent help, call 112 if unavailable.',
    tone: 'contact-green',
  },
  {
    number: '102',
    title: 'Ambulance service',
    scope: 'Availability varies by state',
    description: 'Ambulance and patient transport support where the service is available.',
    tone: 'contact-green',
  },
  {
    number: '181',
    title: 'Women Helpline',
    scope: 'Check local availability',
    description: 'Support for women in distress. In immediate danger, call 112.',
    tone: 'contact-purple',
  },
  {
    number: '1098',
    title: 'Child Helpline',
    scope: 'Help for children',
    description: 'Report a child needing care, protection, or assistance.',
    tone: 'contact-orange',
  },
]

export default function ContactsPage() {
  const { t } = useLanguage()
  const [form, setForm] = useState({ text: '', location: '', category: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try { await request('/reports', { method: 'POST', body: JSON.stringify(form) }); setMessage('Community report received. It is unverified and is not an emergency dispatch.'); setForm({ text: '', location: '', category: '' }) }
    catch (error) { setMessage(error.message) }
    finally { setBusy(false) }
  }

  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow"><Phone size={14} /> {t('emergencyContacts').toUpperCase()}</div><h1>{t('emergencyContacts')}</h1><p>For immediate emergency assistance in India, call 112. Availability of other helplines can vary by state.</p></div></div>
    <section className="contact-grid" aria-label="Emergency phone numbers">{emergencyContacts.map((contact) => <article className="contact-card" key={contact.number}>
      <span className={`contact-icon ${contact.tone}`}><Phone size={18} /></span>
      <div><span className="section-kicker">{contact.scope}</span><h2>{contact.title}</h2><p>{contact.description}</p>{contact.officialUrl && <a className="contact-directory-link" href={contact.officialUrl} target="_blank" rel="noreferrer">Official ERSS information ↗</a>}</div>
      <a className="contact-number" href={`tel:${contact.number}`} aria-label={`Call ${contact.title} at ${contact.number}`}><Phone size={14} />{contact.number}</a>
    </article>)}</section>
    <div className="contact-warning"><ShieldAlert size={18} /><p><strong>Use 112 if another number does not connect.</strong> Helpline coverage and routing may change by location. This app does not dispatch assistance; its community report form is not monitored by emergency services.</p></div>
    <section className="panel report-panel"><div className="report-intro"><span className="report-icon"><Headset size={20} /></span><div><span className="section-kicker">UNVERIFIED SUBMISSION</span><h2>{t('shareReport')}</h2><p>Reports are user-submitted, are not verified alerts, and are not monitored by emergency services.</p></div></div><form className="report-form" onSubmit={submit}><label>What did you observe?<textarea required minLength="10" maxLength="2000" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Describe your observation…" /></label><div className="report-fields"><label>{t('location')}<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="City, district or landmark" /></label><label>Category (optional)<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} maxLength="80" placeholder="Describe the event type" /></label><button className="button button-primary" disabled={busy}><Send size={15} /> {busy ? 'Submitting…' : t('submitReport')}</button></div>{message && <p className="form-message" role="status">{message}</p>}</form></section>
  </div>
}