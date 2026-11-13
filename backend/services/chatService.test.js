import assert from 'node:assert/strict'
import test from 'node:test'
import { answerChat } from './chatService.js'
import { SACHET_ALERTS_API_URL, SachetSourceError } from './sources/sachet.js'
import { OpenMeteoError } from './sources/openMeteo.js'

const alert = {
  id: 'IN-12345_1',
  alertId: 'IN-12345_1',
  type: 'Heavy Rain',
  disasterType: 'Heavy Rain',
  severity: 'HIGH',
  title: 'Heavy rain warning for Mumbai',
  description: 'Heavy rainfall may occur in Mumbai district.',
  state: 'Maharashtra',
  district: 'Mumbai',
  city: '',
  source: 'Maharashtra SDMA',
  source_url: 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=12345',
  sourceUrl: 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=12345',
  issued_at: '2026-11-12T10:00:00+05:30',
  timestamp: '2026-11-12T10:00:00+05:30',
  expires_at: '2026-11-13T10:00:00+05:30',
  verification_status: 'Verified',
  verificationStatus: 'Verified',
  safetyInstructions: ['Follow local authority instructions.'],
}

function getFeed(alerts = [alert], status = 'connected') {
  return async () => ({ alerts, status, warning: '' })
}

function getWeather() {
  return async (location) => ({
    location,
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-11-13T09:00',
      temperatureC: 29.4,
      relativeHumidityPercent: 73,
      precipitationMm: 0.4,
      weatherCode: 61,
      condition: 'Slight rain',
      windSpeedKmh: 14.2,
    },
    dailyForecast: [
      { date: '2026-11-13', condition: 'Slight rain', minimumTemperatureC: 25, maximumTemperatureC: 31, precipitationProbabilityPercent: 80, precipitationMm: 4.2 },
      { date: '2026-11-14', condition: 'Overcast', minimumTemperatureC: 26, maximumTemperatureC: 32, precipitationProbabilityPercent: 10, precipitationMm: 0 },
      { date: '2026-11-15', condition: 'Clear sky', minimumTemperatureC: 26, maximumTemperatureC: 33, precipitationProbabilityPercent: 0, precipitationMm: 0 },
      { date: '2026-11-16', condition: 'Partly cloudy', minimumTemperatureC: 25, maximumTemperatureC: 32, precipitationProbabilityPercent: 20, precipitationMm: 0.1 },
      { date: '2026-11-17', condition: 'Slight rain', minimumTemperatureC: 24, maximumTemperatureC: 30, precipitationProbabilityPercent: 70, precipitationMm: 2.4 },
      { date: '2026-11-18', condition: 'Overcast', minimumTemperatureC: 23, maximumTemperatureC: 29, precipitationProbabilityPercent: 30, precipitationMm: 0.2 },
      { date: '2026-11-19', condition: 'Clear sky', minimumTemperatureC: 24, maximumTemperatureC: 31, precipitationProbabilityPercent: 0, precipitationMm: 0 },
    ],
    source: 'Open-Meteo',
    sourceUrl: 'https://api.open-meteo.com/v1/forecast?latitude=19.076&longitude=72.8777',
  })
}

test('answers active-alert questions from live feed records and includes source links', async () => {
  const result = await answerChat({ message: 'What alerts are active?', language: 'en' }, { getFeed: getFeed() })

  assert.match(result.reply, /1 current, unexpired public CAP alert/)
  assert.match(result.reply, /Heavy rain warning for Mumbai/)
  assert.match(result.reply, /2026-11-12T10:00:00\+05:30/)
  assert.deepEqual(result.sources, [{
    name: 'Maharashtra SDMA',
    url: alert.sourceUrl,
    timestamp: alert.timestamp,
  }])
})

test('maps localized quick prompts to the same live alert query', async () => {
  const result = await answerChat({ message: 'अभी कौन से अलर्ट सक्रिय हैं?', language: 'auto' }, { getFeed: getFeed() })

  assert.match(result.reply, /Heavy rain warning for Mumbai/)
  assert.equal(result.sources[0].url, alert.sourceUrl)
})

test('answers specific alert questions with CAP details and source instructions', async () => {
  const result = await answerChat({
    message: 'Explain this alert',
    alertId: alert.alertId,
  }, { getFeed: getFeed() })

  assert.match(result.reply, /Severity: HIGH/)
  assert.match(result.reply, /Instructions in the official record:\n• Follow local authority instructions\./)
  assert.equal(result.sources[0].url, alert.sourceUrl)
})

test('location searches distinguish no matching alert from no risk', async () => {
  const result = await answerChat({ message: 'Show alerts near Delhi' }, { getFeed: getFeed() })

  assert.match(result.reply, /couldn't find a current SACHET\/NDMA CAP alert matching Delhi/)
  assert.match(result.reply, /does not confirm that the area is safe/)
})

test('marks answers based on cached feed snapshots as stale', async () => {
  const result = await answerChat({ message: 'How severe is the current alert?' }, {
    getFeed: async () => ({ alerts: [alert], status: 'stale' }),
  })

  assert.match(result.reply, /highest listed CAP severity is HIGH/)
  assert.match(result.reply, /using a cached snapshot/)
})

test('returns a clear response when the live alert feed is unavailable', async () => {
  const result = await answerChat({ message: 'What alerts are active?' }, {
    getFeed: async () => { throw new SachetSourceError('SACHET unavailable', { status: 503, url: SACHET_ALERTS_API_URL }) },
  })

  assert.match(result.reply, /can't retrieve the live SACHET\/NDMA alert feed/)
  assert.equal(result.sources[0].url, 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml')
})

test('answers natural-language current weather questions with live readings', async () => {
  let requestedLocation
  const result = await answerChat({ message: 'How hot is it in New Delhi right now?' }, {
    getWeather: async (location) => {
      requestedLocation = location
      return getWeather()(location)
    },
  })

  assert.equal(requestedLocation.id, 'delhi')
  assert.match(result.reply, /29\.4°C/)
  assert.match(result.reply, /humidity 73%/)
  assert.match(result.reply, /wind 14\.2 km\/h/)
  assert.equal(result.sources[0].name, 'Open-Meteo')
})

test('answers a tomorrow rain question from the daily forecast', async () => {
  const result = await answerChat({ message: 'Will it rain tomorrow in Mumbai?' }, { getWeather: getWeather() })

  assert.match(result.reply, /2026-11-14/)
  assert.match(result.reply, /Overcast/)
  assert.match(result.reply, /up to 10% precipitation probability/)
  assert.match(result.reply, /0 mm forecast precipitation/)
})

test('limits multi-day forecast answers to the requested number of days', async () => {
  const result = await answerChat({ message: 'How much rain is expected in Mumbai over the next 3 days?' }, {
    getWeather: getWeather(),
  })

  assert.match(result.reply, /3-day forecast for Mumbai/)
  assert.match(result.reply, /2026-11-13/)
  assert.match(result.reply, /2026-11-15/)
  assert.doesNotMatch(result.reply, /2026-11-16/)
})

test('answers umbrella questions using the daily precipitation forecast', async () => {
  const result = await answerChat({ message: 'Should I carry an umbrella in Mumbai today?' }, {
    getWeather: getWeather(),
  })

  assert.match(result.reply, /up to 80% precipitation probability/)
  assert.match(result.reply, /consider carrying an umbrella/i)
})

test('answers emergency-kit questions without treating the kit as a location', async () => {
  const result = await answerChat({ message: 'What should I keep in an emergency kit?' }, {
    getFeed: async () => { throw new Error('An emergency-kit question should not query alerts.') },
  })

  assert.match(result.reply, /Emergency kit checklist/)
  assert.match(result.reply, /Safe drinking water/)
  assert.match(result.reply, /Personal medicines/)
})

test('gives hazard-specific actions for an immediate flood-safety question', async () => {
  const result = await answerChat({ message: 'What should I do during a flood?' }, {
    getFeed: async () => { throw new Error('A flood-safety question should not query alerts.') },
  })

  assert.match(result.reply, /DURING:/)
  assert.match(result.reply, /Move to higher ground/)
  assert.match(result.reply, /Never walk, swim, or drive through floodwater/)
  assert.match(result.reply, /contact local emergency services/)
})

test('routes heavy-rain safety questions to preparedness instead of asking for a weather city', async () => {
  const result = await answerChat({ message: 'What should I do during heavy rain in Chennai?' }, {
    getFeed: async () => { throw new Error('A safety question should not query alerts.') },
    getWeather: async () => { throw new Error('A safety question should not request a forecast.') },
  })

  assert.match(result.reply, /Heavy rain and urban waterlogging/)
  assert.match(result.reply, /Avoid unnecessary travel/)
})

test('keeps weather conditions during a hazard on the weather path', async () => {
  const result = await answerChat({ message: 'What is the weather during a cyclone in Mumbai?' }, {
    getWeather: getWeather(),
  })

  assert.match(result.reply, /Current weather for Mumbai/)
})

test('asks for a configured city when a weather question has no location', async () => {
  const result = await answerChat({ message: 'What is the weather like?' })

  assert.match(result.reply, /Which configured city would you like weather for/)
  assert.match(result.reply, /Mumbai/)
})

test('reports weather source failures without inventing conditions', async () => {
  const result = await answerChat({ message: 'Weather in Mumbai' }, {
    getWeather: async () => {
      throw new OpenMeteoError('Upstream unavailable', { status: 503, url: 'https://api.open-meteo.com/v1/forecast' })
    },
  })

  assert.match(result.reply, /couldn't retrieve live weather data/)
  assert.match(result.reply, /don't want to guess/)
  assert.equal(result.sources[0].url, 'https://api.open-meteo.com/v1/forecast')
})

test('recognizes localized weather and city names', async () => {
  const result = await answerChat({ message: 'कल मुंबई में बारिश होगी?' }, { getWeather: getWeather() })

  assert.match(result.reply, /Open-Meteo forecast for Mumbai on 2026-11-14/)
  assert.match(result.reply, /up to 10% precipitation probability/)
})

test('keeps explicit weather alert questions on the official alert path', async () => {
  const result = await answerChat({ message: 'Is there a rain warning in Mumbai?' }, {
    getFeed: getFeed(),
    getWeather: async () => { throw new Error('Weather should not be requested for an alert query.') },
  })

  assert.match(result.reply, /current SACHET\/NDMA alert/)
})
