// Synthetic weather is reserved for explicitly enabled mock mode.
export function mockWeatherForCity(city = 'Mumbai') {
  const name = String(city).trim().slice(0, 80) || 'Mumbai'
  const offset = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 8
  return { city: name, temperature: 28 + offset, humidity: 64 + offset, windSpeed: 12 + offset, rainfall: offset * 1.4, condition: offset > 4 ? 'Light rain' : 'Cloudy intervals', visibility: 8 + (offset % 3), source: 'Mock demo forecast' }
}