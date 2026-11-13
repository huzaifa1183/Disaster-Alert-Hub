import { useState } from 'react'
import {
  Check, ChevronDown, CloudLightning, ExternalLink, Flame, House,
  MapPin, Mountain, PackageCheck, ShieldAlert, ShieldCheck, Snowflake,
  PlayCircle, ThermometerSun, Waves, Wind,
} from 'lucide-react'
import { emergencyKit, familyPlan, preparednessGuides } from '../../../shared/preparednessGuides.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const guideIcons = {
  flood: Waves,
  cyclone: Wind,
  earthquake: House,
  heat: ThermometerSun,
  lightning: CloudLightning,
  landslide: Mountain,
  tsunami: Waves,
  rain: Waves,
  wind: Wind,
  fire: Flame,
  avalanche: Snowflake,
}

const phases = [
  ['BEFORE', 'before'],
  ['DURING', 'during'],
  ['AFTER', 'after'],
]

const preparednessVideos = [
  { id: 'y16aMLeh91Q', category: 'General disaster preparedness', title: '10 things you should know about disaster risk reduction', publisher: 'Humanitarian Practice Network', topic: 'general' },
  { id: 'PLuruR7TY4M', category: 'Earthquake preparedness', title: 'Earthquake Risk Management | Prof. Ravi Sinha | IIT Bombay | Disaster Management | Risk Reduction', publisher: 'Disaster Risk Reduction and Resilience', topic: 'earthquake' },
  { id: '3TNRFsyuJGs', category: 'Cyclone and storm surges', title: 'Webinar on “Cyclone and Storm Surges” | NIDM | MHA | IMD', publisher: 'National Institute of Disaster Management', topic: 'cyclone' },
  { id: 'G-P1CZB3krk', category: 'Flood preparedness', title: 'Webinar on “Cloudburst and Flood” | MHA | NIDM', publisher: 'National Institute of Disaster Management', topic: 'flood' },
  { id: 'a62wCTejfKg', category: 'Lightning safety', title: 'Lightning General Awareness', publisher: 'Kerala State Disaster Management Authority', topic: 'lightning' },
]

export default function InformationPage() {
  const { t } = useLanguage()
  const [expandedGuide, setExpandedGuide] = useState('flood')

  return <div className="page-enter">
    <div className="page-heading"><div>
      <div className="eyebrow"><ShieldCheck size={14} /> {t('preparednessInfo').toUpperCase()}</div>
      <h1>{t('preparednessInfo')}</h1>
      <p>Practical checklists for household planning and common hazards.</p>
    </div></div>

    <div className="contact-warning" role="note">
      <ShieldAlert size={18} />
      <p><strong>Use current local instructions.</strong> This educational checklist is general, not an official alert or a substitute for emergency services, medical advice, or directions from local authorities. Hazards vary by location; follow current official guidance.</p>
    </div>

    <section className="prep-overview-grid" aria-label="Household preparedness">
      <div className="panel prep-panel">
        <div className="panel-heading"><span className="prep-panel-icon"><MapPin size={16} /></span><div><h2>Make a household plan</h2><p>Agree on these steps before an emergency.</p></div></div>
        <ul className="prep-list">{familyPlan.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul>
      </div>
      <div className="panel prep-panel">
        <div className="panel-heading"><span className="prep-panel-icon prep-kit-icon"><PackageCheck size={16} /></span><div><h2>Build a go-bag</h2><p>Store essentials together and adapt for your household.</p></div></div>
        <div className="checklist prep-kit-list"><strong><Check size={12} /> INCLUDE</strong>{emergencyKit.map((item) => <span key={item}>{item}</span>)}</div>
      </div>
    </section>

    <section aria-labelledby="hazard-guides-heading">
      <div className="prep-section-heading"><div><div className="eyebrow"><ShieldCheck size={13} /> HAZARD-BY-HAZARD</div><h2 id="hazard-guides-heading">What to do before, during, and after</h2></div></div>
      <div className="guide-list">
        {preparednessGuides.map((guide) => {
          const Icon = guideIcons[guide.icon]
          const isOpen = expandedGuide === guide.id
          const contentId = `guide-details-${guide.id}`
          return <article className={`guide-item${isOpen ? ' guide-open' : ''}`} key={guide.id}>
            <button type="button" className="guide-toggle" aria-expanded={isOpen} aria-controls={contentId} onClick={() => setExpandedGuide(isOpen ? '' : guide.id)}>
              <span className={`guide-icon guide-${guide.tone}`}><Icon size={18} /></span>
              <span className="guide-name"><strong>{guide.title}</strong><small>{guide.summary}</small></span>
              <ChevronDown className="guide-chev" size={17} />
            </button>
            <div className="guide-content" id={contentId} hidden={!isOpen}>
              <p className="guide-definition">{guide.summary}</p>
              <div className="guide-signs"><strong>WARNING SIGNS / UPDATES</strong><p>{guide.signs}</p></div>
              <div className="guide-steps">{phases.map(([label, key]) => <div key={key}>
                <span>{label}</span>
                <ul>{guide[key].map((step) => <li key={step}>{step}</li>)}</ul>
              </div>)}</div>
            </div>
          </article>
        })}
      </div>
    </section>

    <section className="panel video-resources" aria-label="Preparedness videos">
      <div className="panel-heading"><div><span className="section-kicker">YOUTUBE</span><h2>{t('preparedness')} · YouTube</h2></div></div>
      <div className="video-resource-grid">{preparednessVideos.map((video) => (
        <a className="video-resource" key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
          <span className={`video-thumbnail video-thumbnail-${video.topic}`} aria-hidden="true">
            <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true }} />
            <span className="video-thumbnail-play"><PlayCircle size={35} /></span>
          </span>
          <span className="video-resource-copy"><small>{video.category}</small><strong>{video.title}</strong><small>{video.publisher} · Watch on YouTube ↗</small></span>
        </a>
      ))}</div>
      <p className="video-resource-note">These educational videos are not live alerts. Check the publisher and follow current instructions from local authorities.</p>
    </section>

    <section className="preparedness-callout" aria-label="Official information sources">
      <span className="callout-icon"><ShieldCheck size={19} /></span>
      <div><strong>Check official updates for your location</strong><p>Use your state or district disaster-management authority and relevant government weather or emergency services for current alerts and evacuation instructions.</p></div>
      <div className="callout-links">
        <a href="https://ndma.gov.in/" target="_blank" rel="noreferrer">NDMA <ExternalLink size={12} /></a>
        <a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">India Meteorological Department <ExternalLink size={12} /></a>
        <a href="https://aapdamitra.ndma.gov.in/category/volunteer-training/" target="_blank" rel="noreferrer">Aapda Mitra training <ExternalLink size={12} /></a>
        <a href="https://www.youtube.com/@NIDMINDIA" target="_blank" rel="noreferrer">NIDM India <ExternalLink size={12} /></a>
      </div>
    </section>
  </div>
}
