import { ShieldAlert, ShieldCheck } from 'lucide-react'

export default function InformationPage() {
  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> OFFICIAL GUIDANCE</div><h1>Preparedness information</h1><p>Verified government guidance is not connected to this app.</p></div></div>
    <div className="contact-warning" role="status"><ShieldAlert size={18} /><p><strong>No official guidance source connected.</strong> No preparedness instructions are shown here rather than presenting unverified content as government advice. This app supplements, and does not replace, official government warnings.</p></div>
  </div>
}
