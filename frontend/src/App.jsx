import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { io } from 'socket.io-client'
import { request, API_URL } from './services/api.js'
import Layout from './components/Layout.jsx'
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const AlertsPage = lazy(() => import('./pages/AlertsPage.jsx'))
const MapPage = lazy(() => import('./pages/MapPage.jsx'))
const AlertDetail = lazy(() => import('./pages/AlertDetail.jsx'))
const WeatherPage = lazy(() => import('./pages/WeatherPage.jsx'))
const InformationPage = lazy(() => import('./pages/InformationPage.jsx'))
const ContactsPage = lazy(() => import('./pages/ContactsPage.jsx'))
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

const AlertContext = createContext(null)
export const useAlerts = () => useContext(AlertContext)

export default function App() {
  const [alerts, setAlerts] = useState([])
  const [alertsError, setAlertsError] = useState('')
  const [alertsWarning, setAlertsWarning] = useState('')
  const [mockDataEnabled, setMockDataEnabled] = useState(false)
  const [officialAlertFeed, setOfficialAlertFeed] = useState('connecting')
  const [connected, setConnected] = useState(false)
  const [toast, setToast] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState(null)

  const refreshAlerts = async () => {
    try {
      const result = await request('/alerts')
      if (!Array.isArray(result.alerts)) throw new Error('Alert API returned an invalid response.')
      setAlerts(result.alerts)
      setOfficialAlertFeed(result.status || 'unavailable')
      setAlertsWarning(result.warning || '')
      setAlertsError('')
    } catch (reason) {
      setAlerts([])
      setOfficialAlertFeed('unavailable')
      setAlertsWarning('')
      setAlertsError(reason.message || 'Live alert data unavailable.')
    }
  }

  useEffect(() => {
    refreshAlerts()
    request('/health').then((health) => {
      setMockDataEnabled(health.mockDataEnabled === true)
      if (health.mockDataEnabled === true) setOfficialAlertFeed('mock')
    }).catch(() => {})
    request('/notifications').then(setNotifications).catch(() => {})
    const refreshTimer = window.setInterval(refreshAlerts, 60_000)
    const socket = io(API_URL.replace(/\/api$/, ''), { reconnectionAttempts: 5 })
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('alert:created', (alert) => {
      setAlerts((current) => [alert, ...current.filter((item) => item.alertId !== alert.alertId)])
      if (alert.severity === 'CRITICAL') setToast({ title: 'Critical alert updated', message: alert.title })
    })
    socket.on('alert:updated', (alert) => setAlerts((current) => current.map((item) => item.alertId === alert.alertId ? alert : item)))
    socket.on('alert:deleted', (id) => setAlerts((current) => current.filter((item) => item.alertId !== id)))
    socket.on('notification:created', (notification) => setNotifications((current) => [notification, ...current.filter((item) => item._id !== notification._id)].slice(0, 30)))
    return () => {
      window.clearInterval(refreshTimer)
      socket.close()
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  return (
    <AlertContext.Provider value={{ alerts, alertsError, alertsWarning, refreshAlerts, mockDataEnabled, officialAlertFeed, connected, toast, setToast, notifications, setNotifications, chatOpen, setChatOpen, chatPrompt, setChatPrompt }}>
      <Suspense fallback={<div className="page-loading" role="status">Opening workspace…</div>}><Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="alerts/:id" element={<AlertDetail />} />
          <Route path="map" element={<MapPage />} />
          <Route path="weather" element={<WeatherPage />} />
          <Route path="preparedness" element={<InformationPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes></Suspense>
    </AlertContext.Provider>
  )
}