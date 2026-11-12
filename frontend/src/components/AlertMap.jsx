import { useMemo } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { SeverityPill } from './AlertCard.jsx'
import { formatTime } from '../utils/format.js'
import 'leaflet/dist/leaflet.css'

const severityColor = { CRITICAL: '#d63f3f', HIGH: '#ed8a31', MEDIUM: '#d1a52e', LOW: '#2f8d71' }

export default function AlertMap({ alerts, className = '' }) {
  const points = useMemo(() => alerts.filter((alert) => Number.isFinite(Number(alert.latitude)) && Number.isFinite(Number(alert.longitude))), [alerts])
  return (
    <div className={`map-frame ${className}`}>
      <MapContainer center={[22.8, 79.1]} zoom={4.6} minZoom={3} scrollWheelZoom zoomControl={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="bottomright" />
        {points.map((alert) => <CircleMarker key={alert.alertId} center={[Number(alert.latitude), Number(alert.longitude)]} radius={alert.severity === 'CRITICAL' ? 10 : 7} pathOptions={{ color: severityColor[alert.severity] || '#41657b', fillColor: severityColor[alert.severity] || '#41657b', fillOpacity: 0.86, weight: 2 }}>
          <Popup><div className="map-popup"><div className="alert-card-top"><b>{alert.disasterType}</b><SeverityPill severity={alert.severity} /></div><strong>{alert.city}, {alert.state}</strong><p>{alert.description}</p><small>{alert.source} · {formatTime(alert.timestamp)} · {alert.verificationStatus}</small><Link to={`/alerts/${alert.alertId}`}>View alert details →</Link></div></Popup>
        </CircleMarker>)}
      </MapContainer>
      <div className="map-demo-tag"><span /> {points.length} ALERT LOCATIONS</div>
    </div>
  )
}