import { useEffect, useState } from 'react'
import { CloudDrizzle, CloudSun, Droplets, MapPin, Search, Sun, Wind } from 'lucide-react'
import { request } from '../services/api.js'
import { formatTime } from '../utils/format.js'

function forecastIcon(weatherCode) {
  if ([0, 1].includes(weatherCode)) return Sun
  if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82) || weatherCode >= 95) return CloudDrizzle
  return CloudSun
}

function formatForecastDate(date, index) {
  if (index === 0) return 'Today'
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })
}

export default function WeatherPage() {
  const [locations, setLocations] = useState([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [query, setQuery] = useState('')
  const [weather, setWeather] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async (location) => {
    setBusy(true)
    setError('')
    setWeather(null)
    setSelectedLocationId(location.id)
    try {
      setWeather(await request(`/weather?city=${encodeURIComponent(location.id)}`))
    } catch (reason) {
      setError(reason.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let active = true
    const initialize = async () => {
      setBusy(true)
      try {
        const configuredLocations = await request('/weather/locations')
        if (!active) return
        setLocations(configuredLocations)
        const defaultLocation = configuredLocations.find((location) => location.isDefault) || configuredLocations[0]
        if (!defaultLocation) throw new Error('No weather locations are configured.')
        setSelectedLocationId(defaultLocation.id)
        setWeather(await request(`/weather?city=${encodeURIComponent(defaultLocation.id)}`))
      } catch (reason) {
        if (active) setError(reason.message)
      } finally {
        if (active) setBusy(false)
      }
    }
    initialize()
    return () => { active = false }
  }, [])

  const search = (event) => {
    event.preventDefault()
    const needle = query.trim().toLocaleLowerCase()
    const match = locations.find((location) => [location.id, location.city, location.district]
      .some((value) => value.toLocaleLowerCase() === needle))
    if (!match) {
      setError('Choose a configured city or district from the location list.')
      return
    }
    load(match)
  }

  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow"><CloudSun size={14} /> WEATHER MONITOR</div><h1>Weather outlook</h1><p>Current conditions and forecast from Open-Meteo.</p></div><span className="data-source">LIVE MODEL DATA</span></div>
    <div className="weather-search-row"><form className="weather-search" onSubmit={search}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a configured city or district" aria-label="Search a configured city or district" /><button type="submit" className="button button-primary">Search</button></form><div className="city-chips">{locations.map((location) => <button key={location.id} className={selectedLocationId === location.id ? 'city-chip active' : 'city-chip'} onClick={() => load(location)}>{location.city}</button>)}</div></div>
    {error && <div className="inline-error" role="alert">{error}</div>}
    {weather && <><section className="weather-hero panel"><div className="weather-overview"><div className="eyebrow"><MapPin size={14} /> {weather.location.city.toUpperCase()} · {weather.location.district.toUpperCase()}, {weather.location.state.toUpperCase()}</div><div className="weather-condition"><WeatherIcon code={weather.current.weatherCode} /><div><strong>{Math.round(weather.current.temperatureC)}°</strong><span>{weather.current.condition}</span></div></div><p>Feels like {Math.round(weather.current.apparentTemperatureC)}° <span>·</span> Observed {weather.current.time} ({weather.timezone})</p><p><a href={weather.sourceUrl} target="_blank" rel="noreferrer">Source: Open-Meteo</a> <span>·</span> Retrieved {formatTime(weather.retrievedAt)}</p></div><div className="weather-metrics"><WeatherMetric icon={Droplets} label="Humidity" value={`${weather.current.relativeHumidityPercent}%`} /><WeatherMetric icon={Wind} label="Wind speed" value={`${weather.current.windSpeedKmh} km/h`} /><WeatherMetric icon={CloudDrizzle} label="Rainfall now" value={`${weather.current.rainMm} mm`} /><WeatherMetric icon={Droplets} label="Precipitation now" value={`${weather.current.precipitationMm} mm`} /></div></section>
      <section className="panel forecast-panel"><div className="panel-heading"><div><span className="section-kicker">MODEL OUTLOOK</span><h2>5-day forecast</h2></div><span className="chart-note">Local time: {weather.timezone}</span></div><div className="forecast-grid">{weather.dailyForecast.map((day, index) => { const Icon = forecastIcon(day.weatherCode); return <div className="forecast-day" key={day.date}><span>{formatForecastDate(day.date, index)}</span><Icon size={27} /><strong>{Math.round(day.temperatureMaxC)}° <small>{Math.round(day.temperatureMinC)}°</small></strong><span className="forecast-condition">{day.condition}</span><span className="forecast-condition">Rain {day.rainMm} mm · Wind {day.windSpeedMaxKmh} km/h</span></div> })}</div></section>
      <div className="weather-disclaimer"><span><CloudSun size={16} /></span><p><strong>Forecast, not an official warning.</strong> Open-Meteo model data may be delayed or inaccurate and does not replace IMD or other government advisories. Open-Meteo data is used under CC-BY 4.0; see its <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">terms of use</a>.</p></div></>}
    {busy && <div className="loading-line" role="status">Loading live weather…</div>}
  </div>
}

function WeatherIcon({ code }) {
  const Icon = forecastIcon(code)
  return <Icon size={46} strokeWidth={1.4} />
}

function WeatherMetric({ icon: Icon, label, value }) { return <div className="weather-metric"><span><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong></div></div> }
