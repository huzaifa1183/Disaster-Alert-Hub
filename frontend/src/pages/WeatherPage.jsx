import { useEffect, useState } from 'react'
import { CloudDrizzle, CloudSun, Droplets, MapPin, Search, Sun, Wind } from 'lucide-react'
import { request } from '../services/api.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

function weatherIcon(weatherCode) {
  if ([0, 1].includes(weatherCode)) return Sun
  if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82) || weatherCode >= 95) return CloudDrizzle
  return CloudSun
}

function aqiBand(value) {
  if (!Number.isFinite(value)) return 'unknown'
  if (value <= 50) return 'good'
  if (value <= 100) return 'moderate'
  if (value <= 150) return 'sensitive'
  if (value <= 200) return 'unhealthy'
  if (value <= 300) return 'very-unhealthy'
  return 'hazardous'
}

function aqiLabel(value) {
  return ({
    good: 'Good',
    moderate: 'Moderate',
    sensitive: 'Unhealthy for sensitive groups',
    unhealthy: 'Unhealthy',
    'very-unhealthy': 'Very unhealthy',
    hazardous: 'Hazardous',
    unknown: 'Unavailable',
  })[aqiBand(value)]
}

export default function WeatherPage() {
  const { t } = useLanguage()
  const [locations, setLocations] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [query, setQuery] = useState('')
  const [weather, setWeather] = useState(null)
  const [busy, setBusy] = useState(false)
  const [searchBusy, setSearchBusy] = useState(false)
  const [error, setError] = useState('')
  const [isLiveUnavailable, setIsLiveUnavailable] = useState(false)

  const load = async (location) => {
    setBusy(true)
    setError('')
    setIsLiveUnavailable(false)
    setWeather(null)
    setSelectedLocationId(location.id)
    try {
      const locationQuery = location.countryCode === 'IN'
        ? new URLSearchParams({
          id: location.id,
          city: location.city,
          district: location.district,
          state: location.state,
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          countryCode: location.countryCode,
        })
        : new URLSearchParams({ city: location.id })
      setSearchResults([])
      setWeather(await request(`/weather?${locationQuery}`))
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

  const search = async (event) => {
    event.preventDefault()
    const searchTerm = query.trim()
    if (searchTerm.length < 2) {
      setError('Enter at least 2 characters to search Indian places.')
      setIsLiveUnavailable(false)
      return
    }
    setSearchBusy(true)
    setSearchResults([])
    setError('')
    setIsLiveUnavailable(false)
    try {
      const results = await request(`/weather/search?q=${encodeURIComponent(searchTerm)}`)
      setSearchResults(results)
      if (!results.length) setError(`No matching Indian places found for “${searchTerm}”. Try a nearby town or district name.`)
    } catch (reason) {
      setError(reason.message || 'Indian place search failed.')
      setIsLiveUnavailable(true)
    } finally {
      setSearchBusy(false)
    }
  }

  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow"><CloudSun size={14} /> {t('weather').toUpperCase()}</div><h1>{t('weather')} · India</h1><p>Search India-wide for villages, towns, and cities. If a small village is not listed, try its district or nearest town.</p></div><span className="data-source">LIVE OPEN-METEO DATA</span></div>
    <div className="weather-search-row">
      <form className="weather-search" onSubmit={search}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchWeather')} aria-label={t('searchWeather')} /><button type="submit" className="button button-primary" disabled={searchBusy}>{searchBusy ? t('searching') : t('searchWeather')}</button></form>
      <div className="weather-popular"><span>POPULAR CITIES</span><div className="city-chips">{locations.map((location) => <button key={location.id} className={selectedLocationId === location.id ? 'city-chip active' : 'city-chip'} onClick={() => load(location)}>{location.city}</button>)}</div></div>
    </div>
    {searchBusy && <div className="loading-line" role="status">Searching Indian place names…</div>}
    {searchResults.length > 0 && <section className="weather-place-results" aria-label={t('choosePlace')}>
      <div className="place-results-heading"><strong>{t('choosePlace')}</strong><span>{searchResults.length} matches</span></div>
      <div className="place-results-grid">{searchResults.map((location) => <button type="button" className="place-result" key={location.id} onClick={() => { setQuery(location.city); load(location) }}>
        <MapPin size={16} /><span><strong>{location.city}</strong><small>{location.district}, {location.state}</small></span>
      </button>)}</div>
    </section>}
    {error && <div className="inline-error" role="alert"><strong>{isLiveUnavailable ? 'Live data unavailable.' : 'Weather request could not be completed.'}</strong> {error === 'Live data unavailable' ? '' : error}</div>}
    {weather && <><section className="weather-hero panel"><div className="weather-overview"><div className="eyebrow"><MapPin size={14} /> {weather.location.city.toUpperCase()} · {weather.location.district.toUpperCase()}, {weather.location.state.toUpperCase()}</div><div className="weather-condition"><WeatherIcon code={weather.current.weatherCode} /><div><strong>{weather.current.temperatureC}°C</strong><span>{weather.current.condition}</span></div></div><p>Open-Meteo API timestamp: <time>{weather.current.time}</time> ({weather.timezone})</p><p><a href={weather.sourceUrl} target="_blank" rel="noreferrer">Source: {weather.source}</a></p></div><div className="weather-metrics">    <WeatherMetric icon={CloudSun} label={t('temperature')} value={`${weather.current.temperatureC} °C`} source={weather.source} timestamp={weather.current.time} /><WeatherMetric icon={Droplets} label={t('relativeHumidity')} value={`${weather.current.relativeHumidityPercent}%`} source={weather.source} timestamp={weather.current.time} /><WeatherMetric icon={CloudDrizzle} label={t('precipitation')} value={`${weather.current.precipitationMm} mm`} source={weather.source} timestamp={weather.current.time} /><WeatherMetric icon={Wind} label={t('windSpeed')} value={`${weather.current.windSpeedKmh} km/h`} source={weather.source} timestamp={weather.current.time} /><WeatherMetric icon={CloudSun} label="Weather code" value={weather.current.weatherCode} source={weather.source} timestamp={weather.current.time} /></div></section>
      <AirQualityPanel airQuality={weather.airQuality} />
      <div className="weather-disclaimer"><span><CloudSun size={16} /></span><p><strong>Weather data is not an official warning.</strong> Open-Meteo model data may be delayed or inaccurate and does not replace IMD or other government advisories. Open-Meteo data is used under CC-BY 4.0; see its <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">terms of use</a>.</p></div></>}
    {busy && <div className="loading-line" role="status">Loading live weather…</div>}
  </div>
}

function WeatherIcon({ code }) {
  const Icon = weatherIcon(code)
  return <Icon size={46} strokeWidth={1.4} />
}

function WeatherMetric({ icon: Icon, label, value, source, timestamp }) { return <div className="weather-metric"><span><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong><small>{source} · API time {timestamp}</small></div></div> }

function AirQualityPanel({ airQuality }) {
  const { t } = useLanguage()
  if (!airQuality || airQuality.status === 'unavailable') {
    return <section className="air-quality-panel panel" aria-label={t('airQuality')}>
      <div className="air-quality-heading"><div><div className="eyebrow"><Wind size={13} /> {t('airQuality').toUpperCase()}</div><h2>AQI estimate unavailable</h2></div></div>
      <p className="air-quality-message">{airQuality?.message || 'Air-quality data was not returned for this location.'} Weather conditions are still available.</p>
    </section>
  }

  const usBand = aqiBand(airQuality.usAqi)
  return <section className="air-quality-panel panel" aria-label={t('airQuality')}>
    <div className="air-quality-heading"><div><div className="eyebrow"><Wind size={13} /> {t('airQuality').toUpperCase()}</div><h2>Air quality estimate</h2></div><span className="air-quality-time">{airQuality.time} · Asia/Kolkata</span></div>
    <div className="air-quality-grid">
      <div className={`aqi-index aqi-${usBand}`}><small>US AQI estimate</small><strong>{Number.isFinite(airQuality.usAqi) ? Math.round(airQuality.usAqi) : 'N/A'}</strong><span>{aqiLabel(airQuality.usAqi)}</span></div>
      <AirQualityMetric label="European AQI" value={airQuality.europeanAqi} unit="" />
      <AirQualityMetric label="PM2.5" value={airQuality.pm25} unit="µg/m³" />
      <AirQualityMetric label="PM10" value={airQuality.pm10} unit="µg/m³" />
    </div>
    <p className="air-quality-note">Model-based estimates from {airQuality.source}. The US AQI is not India’s CPCB National AQI or a regulatory monitor reading. Follow official health and pollution advisories.</p>
    {airQuality.sourceUrl && <a className="air-quality-source" href={airQuality.sourceUrl} target="_blank" rel="noreferrer">Source: {airQuality.source}</a>}
  </section>
}

function AirQualityMetric({ label, value, unit }) {
  return <div className="air-quality-metric"><small>{label}</small><strong>{Number.isFinite(value) ? `${value} ${unit}`.trim() : 'N/A'}</strong></div>
}
