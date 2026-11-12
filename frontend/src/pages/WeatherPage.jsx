import { useEffect, useState } from 'react'
import { CloudDrizzle, CloudSun, Droplets, MapPin, Search, Sun, Wind } from 'lucide-react'
import { request } from '../services/api.js'

function weatherIcon(weatherCode) {
  if ([0, 1].includes(weatherCode)) return Sun
  if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82) || weatherCode >= 95) return CloudDrizzle
  return CloudSun
}

export default function WeatherPage() {
  const [locations, setLocations] = useState([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [query, setQuery] = useState('')
  const [weather, setWeather] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [isLiveUnavailable, setIsLiveUnavailable] = useState(false)

  const load = async (location) => {
    setBusy(true)
    setError('')
    setIsLiveUnavailable(false)
    setWeather(null)
    setSelectedLocationId(location.id)
    try {
      setWeather(await request(`/weather?city=${encodeURIComponent(location.id)}`))
    } catch (reason) {
      setError(reason.message || 'Open-Meteo request failed.')
      setIsLiveUnavailable(true)
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
        if (active) {
          setError(reason.message || 'Open-Meteo request failed.')
          setIsLiveUnavailable(reason.message !== 'No weather locations are configured.')
        }
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
      setIsLiveUnavailable(false)
      return
    }
    load(match)
  }

  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow"><CloudSun size={14} /> WEATHER MONITOR</div><h1>Current weather</h1><p>Current conditions from Open-Meteo for configured Indian locations.</p></div><span className="data-source">LIVE OPEN-METEO DATA</span></div>
    <div className="weather-search-row"><form className="weather-search" onSubmit={search}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a configured city or district" aria-label="Search a configured city or district" /><button type="submit" className="button button-primary">Search</button></form><div className="city-chips">{locations.map((location) => <button key={location.id} className={selectedLocationId === location.id ? 'city-chip active' : 'city-chip'} onClick={() => load(location)}>{location.city}</button>)}</div></div>
    {error && <div className="inline-error" role="alert"><strong>{isLiveUnavailable ? 'Live data unavailable.' : 'Weather request could not be completed.'}</strong> {error === 'Live data unavailable' ? '' : error}</div>}
    {weather && <><section className="weather-hero panel"><div className="weather-overview"><div className="eyebrow"><MapPin size={14} /> {weather.location.city.toUpperCase()} · {weather.location.district.toUpperCase()}, {weather.location.state.toUpperCase()}</div><div className="weather-condition"><WeatherIcon code={weather.current.weatherCode} /><div><strong>{weather.current.temperatureC}°C</strong><span>{weather.current.condition}</span></div></div><p>Open-Meteo API timestamp: <time>{weather.current.time}</time> ({weather.timezone})</p><p><a href={weather.sourceUrl} target="_blank" rel="noreferrer">Source: {weather.source}</a></p></div><div className="weather-metrics"><WeatherMetric icon={CloudSun} label="Temperature" value={`${weather.current.temperatureC} °C`} source={weather.source} timestamp={weather.current.time} /><WeatherMetric icon={Droplets} label="Relative humidity" value={`${weather.current.relativeHumidityPercent}%`} source={weather.source} timestamp={weather.current.time} /><WeatherMetric icon={CloudDrizzle} label="Precipitation" value={`${weather.current.precipitationMm} mm`} source={weather.source} timestamp={weather.current.time} /><WeatherMetric icon={Wind} label="Wind speed" value={`${weather.current.windSpeedKmh} km/h`} source={weather.source} timestamp={weather.current.time} /><WeatherMetric icon={CloudSun} label="Weather code" value={weather.current.weatherCode} source={weather.source} timestamp={weather.current.time} /></div></section>
      <div className="weather-disclaimer"><span><CloudSun size={16} /></span><p><strong>Weather data is not an official warning.</strong> Open-Meteo model data may be delayed or inaccurate and does not replace IMD or other government advisories. Open-Meteo data is used under CC-BY 4.0; see its <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">terms of use</a>.</p></div></>}
    {busy && <div className="loading-line" role="status">Loading live weather…</div>}
  </div>
}

function WeatherIcon({ code }) {
  const Icon = weatherIcon(code)
  return <Icon size={46} strokeWidth={1.4} />
}

function WeatherMetric({ icon: Icon, label, value, source, timestamp }) { return <div className="weather-metric"><span><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong><small>{source} · API time {timestamp}</small></div></div> }
