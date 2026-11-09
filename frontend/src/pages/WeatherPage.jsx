import { useEffect, useState } from 'react'
import { CloudDrizzle, CloudSun, Droplets, Eye, MapPin, Search, Sun, Wind } from 'lucide-react'
import { request } from '../services/api.js'

const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Guwahati']

export default function WeatherPage() {
  const [city, setCity] = useState('Mumbai')
  const [query, setQuery] = useState('')
  const [weather, setWeather] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async (name) => {
    setBusy(true); setError('')
    try { setWeather(await request(`/weather?city=${encodeURIComponent(name)}`)); setCity(name) }
    catch (reason) { setError(reason.message) }
    finally { setBusy(false) }
  }
  useEffect(() => { load('Mumbai') }, [])
  const search = (event) => { event.preventDefault(); if (query.trim()) load(query.trim()) }
  const forecast = ['Today', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => ({ day, high: (weather?.temperature || 31) + [0, 1, -1, 2, 0][index], low: (weather?.temperature || 31) - [7, 6, 8, 5, 7][index], condition: ['Partly cloudy', 'Cloudy', 'Light rain', 'Partly sunny', 'Cloudy'][index], icon: [CloudSun, CloudSun, CloudDrizzle, Sun, CloudSun][index] }))

  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow"><CloudSun size={14} /> WEATHER MONITOR</div><h1>Weather outlook</h1><p>Illustrative city conditions and five-day forecast.</p></div><span className="data-source">MOCK DATA</span></div>
    <div className="weather-search-row"><form className="weather-search" onSubmit={search}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search an Indian city" aria-label="Search city" /><button type="submit" className="button button-primary">Search</button></form><div className="city-chips">{cities.map((name) => <button key={name} className={city === name ? 'city-chip active' : 'city-chip'} onClick={() => load(name)}>{name}</button>)}</div></div>
    {error && <div className="inline-error">{error}</div>}
    {weather && <><section className="weather-hero panel"><div className="weather-overview"><div className="eyebrow"><MapPin size={14} /> {weather.city.toUpperCase()} · DEMO STATION</div><div className="weather-condition"><CloudSun size={46} strokeWidth={1.4} /><div><strong>{weather.temperature}°</strong><span>{weather.condition}</span></div></div><p>Feels like {weather.temperature + 1}° <span>·</span> Updated just now</p></div><div className="weather-metrics"><WeatherMetric icon={Droplets} label="Humidity" value={`${weather.humidity}%`} /><WeatherMetric icon={Wind} label="Wind speed" value={`${weather.windSpeed} km/h`} /><WeatherMetric icon={CloudDrizzle} label="Rainfall" value={`${weather.rainfall.toFixed(1)} mm`} /><WeatherMetric icon={Eye} label="Visibility" value={`${weather.visibility} km`} /></div></section>
      <section className="panel forecast-panel"><div className="panel-heading"><div><span className="section-kicker">PLANNING OUTLOOK</span><h2>5-day forecast</h2></div><span className="chart-note">Illustrative only</span></div><div className="forecast-grid">{forecast.map(({ day, high, low, condition, icon: Icon }) => <div className="forecast-day" key={day}><span>{day}</span><Icon size={27} /><strong>{high}° <small>{low}°</small></strong><span className="forecast-condition">{condition}</span></div>)}</div></section>
      <div className="weather-disclaimer"><span><CloudSun size={16} /></span><p><strong>Demo weather data</strong> This page uses deterministic mock values for demonstration. Check current official weather services before making safety or travel decisions.</p></div></>}
    {busy && <div className="loading-line">Loading city outlook…</div>}
  </div>
}
function WeatherMetric({ icon: Icon, label, value }) { return <div className="weather-metric"><span><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong></div></div> }