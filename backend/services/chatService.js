import { chatLocaleText } from '../../shared/chatLocaleText.js'
import { emergencyKit, preparednessGuides } from '../../shared/preparednessGuides.js'
import { detectLanguage, matchAlertPlace } from './languageDetection.js'
import { SACHET_RSS_URL, SachetSourceError } from './sources/sachet.js'
import { fetchOpenMeteoWeather, OpenMeteoError, buildOpenMeteoUrl } from './sources/openMeteo.js'
import { sachetAlertCache } from './sachetAlertCache.js'
import { weatherLocations } from '../config/weatherLocations.js'

const alertIdPattern = /\bIN-\d+_\d+\b/i
const hazardTerms = [
  'flood', 'flooding', 'cyclone', 'rain', 'storm', 'lightning', 'avalanche',
  'landslide', 'earthquake', 'fire', 'heatwave', 'tsunami', 'wind',
]
const genericLocationTerms = new Set(['me', 'my area', 'here', 'there', 'india'])
const weatherQuestionPattern = /\b(?:weather|forecast|temperature|temp|degree|degrees|hot|cold|rain|rainy|rainfall|precipitation|humidity|humid|wind|windy|cloud|cloudy|sunny|sunshine|storm|thunder|snow|fog|visibility|heat index|feels like|umbrella|drizzle|showers)\b|will it rain|chance of rain|मौसम|बारिश|वर्षा|गर्मी|ठंड|हवा|हवामान|पाऊस|வானிலை|மழை|வெப்பம்|காற்று|వాతావరణం|వర్షం|వేడి|గాలి|আবহাওয়া|আবহাওয়া|বৃষ্টি|গরম|বাতাস|ਮੌਸਮ|ਮੀਂਹ|ਗਰਮੀ|હવામાન|વરસાદ|પવન|ಹವಾಮಾನ|ಮಳೆ|ಬಿಸಿಲು|കാലാവസ്ഥ|മഴ|ചൂട്/i
const explicitAlertPattern = /\b(?:alerts?|warnings?|advisories|notices?|sachet|cap)\b|अलर्ट|चेतावनी|எச்சரிக்கை|హెచ్చరిక|সতর্কতা|ਚੇਤਾਵਨੀ|ચેતવણી|ಎಚ್ಚರಿಕೆ|മുന്നറിയിപ്പ്/i
const weatherDayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const tomorrowPattern = /\b(?:tomorrow|next day)\b|कल|उद्या|நாளை|రేపు|আগামীকাল|ভবিষ্যৎকাল|ਭਲਕੇ|કાલે|ನಾಳೆ|നാളെ/i
const todayPattern = /\b(?:today|tonight)\b|आज|आजच्या|आजचा|ഇന്ന്|இன்று|ఈరోజు|আজ|আজকে|ਅੱਜ|આજે|ಇಂದು/i
const weatherPlaceRecords = weatherLocations.map((location) => ({
  city: location.city,
  district: location.district,
  weatherLocation: location,
}))

function normalized(value) {
  return String(value || '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function findWeatherLocation(message) {
  const text = ` ${normalized(message)} `
  const candidates = weatherLocations
    .flatMap((location) => [location.city, location.district, location.id]
      .filter(Boolean)
      .map((alias) => ({ location, alias: normalized(alias) })))
    .sort((left, right) => right.alias.length - left.alias.length)
  const exactMatch = candidates.find(({ alias }) => alias && text.includes(` ${alias} `))?.location
  if (exactMatch) return exactMatch
  return matchAlertPlace(weatherPlaceRecords, message)?.matches[0]?.weatherLocation
}

function isWeatherQuestion(message) {
  return weatherQuestionPattern.test(message) && !explicitAlertPattern.test(message)
}

function isForecastQuestion(message) {
  return /\b(?:forecast|tomorrow|today|tonight|week|weekly|weekend|next\s+(?:\d+\s+)?days?|coming\s+\d+\s+days?|upcoming\s+\d+\s+days?|sunday|monday|tuesday|wednesday|thursday|friday|saturday|will it rain|chance of rain)\b/i.test(message)
    || tomorrowPattern.test(message)
    || todayPattern.test(message)
}

function forecastWeekday(date) {
  return weatherDayNames[new Date(`${date}T00:00:00Z`).getUTCDay()]
}

function getForecastDays(message, dailyForecast) {
  if (tomorrowPattern.test(message)) return dailyForecast.slice(1, 2)
  if (todayPattern.test(message)) return dailyForecast.slice(0, 1)

  const messageWords = new Set(normalized(message).split(' '))
  const weekday = weatherDayNames.find((day) => messageWords.has(day))
  if (weekday) {
    const nextWeekday = new RegExp(`\\bnext\\s+${weekday}\\b`, 'i').test(message)
    const index = dailyForecast.findIndex((day, dayIndex) =>
      (!nextWeekday || dayIndex > 0) && forecastWeekday(day.date) === weekday)
    return index === -1 ? [] : dailyForecast.slice(index, index + 1)
  }

  const dayCount = message.match(/\b(?:next|coming|upcoming)\s+(\d+)\s+days?\b/i)
  if (dayCount) {
    return dailyForecast.slice(0, Math.min(Number(dayCount[1]), dailyForecast.length))
  }

  if (/\bweekend\b/i.test(message)) {
    return dailyForecast.filter((day) => [0, 6].includes(new Date(`${day.date}T00:00:00Z`).getUTCDay()))
  }

  return dailyForecast
}

function answerWeather(weather, message) {
  const { location, current, dailyForecast, source, sourceUrl } = weather
  const sources = [{ name: source, url: sourceUrl, timestamp: current.time }]
  const forecast = isForecastQuestion(message)

  if (forecast) {
    const forecastDays = getForecastDays(message, dailyForecast)
    const messageWords = new Set(normalized(message).split(' '))
    if (/\bumbrella\b/i.test(message) && forecastDays.length === 1) {
      const forecastDay = forecastDays[0]
      return {
        reply: `For ${forecastDay.date} in ${location.city}, Open-Meteo forecasts ${forecastDay.condition} with up to ${forecastDay.precipitationProbabilityPercent}% precipitation probability and ${forecastDay.precipitationMm} mm of precipitation. Consider carrying an umbrella if you'll be outdoors and want protection from possible rain. This is a model estimate, not an official warning.`,
        sources,
        language: 'en',
      }
    }

    const asksForSpecificDay = tomorrowPattern.test(message)
      || todayPattern.test(message)
      || weatherDayNames.some((day) => messageWords.has(day))
    if (forecastDays.length === 1 && asksForSpecificDay) {
      const forecastDay = forecastDays[0]
      return {
        reply: `Open-Meteo forecast for ${location.city} on ${forecastDay.date}: ${forecastDay.condition}, ${forecastDay.minimumTemperatureC}–${forecastDay.maximumTemperatureC}°C, up to ${forecastDay.precipitationProbabilityPercent}% precipitation probability, and ${forecastDay.precipitationMm} mm forecast precipitation. Forecasts are model estimates, not official warnings.`,
        sources,
        language: 'en',
      }
    }

    if (!forecastDays.length) {
      return {
        reply: `Open-Meteo does not have the requested dates in its available ${dailyForecast.length}-day forecast for ${location.city}. I won't guess those conditions.`,
        sources,
        language: 'en',
      }
    }

    const rows = forecastDays.map((day) => `${day.date}: ${day.condition}, ${day.minimumTemperatureC}–${day.maximumTemperatureC}°C, rain chance up to ${day.precipitationProbabilityPercent}%, ${day.precipitationMm} mm precipitation`)
    return {
      reply: `Open-Meteo's ${forecastDays.length}-day forecast for ${location.city} (model estimates, not official warnings):\n${rows.map((row) => `• ${row}`).join('\n')}`,
      sources,
      language: 'en',
    }
  }

  if (/\bumbrella\b/i.test(message) && dailyForecast[0]) {
    const today = dailyForecast[0]
    return {
      reply: `For today in ${location.city}, Open-Meteo forecasts ${today.condition} with up to ${today.precipitationProbabilityPercent}% precipitation probability and ${today.precipitationMm} mm of precipitation. Consider carrying an umbrella if you'll be outdoors and want protection from possible rain. This is a model estimate, not an official warning.`,
      sources,
      language: 'en',
    }
  }

  return {
    reply: `Current weather for ${location.city} as of ${current.time} (${weather.timezone}): ${current.condition}, ${current.temperatureC}°C, humidity ${current.relativeHumidityPercent}%, precipitation ${current.precipitationMm} mm, and wind ${current.windSpeedKmh} km/h. The precipitation value is the current reading, not a daily total. Open-Meteo data is model-based and is not an official weather warning.`,
    sources,
    language: 'en',
  }
}

function answerWeatherLocationPrompt() {
  const cities = weatherLocations.map((location) => location.city).join(', ')
  return {
    reply: `Which configured city would you like weather for? Current conditions and a 7-day forecast are available for: ${cities}.`,
    sources: [],
    language: 'en',
  }
}

function answerWeatherUnavailable(location, error) {
  return {
    reply: `I couldn't retrieve live weather data for ${location.city} right now. Please try again shortly; I don't want to guess current conditions or a forecast.`,
    sources: [{ name: 'Open-Meteo', url: error.url || buildOpenMeteoUrl(location).toString() }],
    language: 'en',
  }
}

function asksForLiveAlerts(message) {
  return /\b(?:alerts?|advisories|notices?|sachet|cap)\b|\b(?:warning|warnings)\s+(?:for|in|near|issued|today|currently|active)\b|\b(?:weather|rain|flood|cyclone|storm)\s+warnings?\b/i.test(message)
}

function answerPreparedness(message) {
  const text = normalized(message)
  const asksForKit = /\b(?:emergency kit|go bag|emergency supplies|supply kit)\b/.test(text)
    || /\bwhat\s+(?:should|do)\s+(?:i|we)\s+(?:pack|keep|include)\b/.test(text)
  if (asksForKit) {
    return {
      reply: `Emergency kit checklist:\n${emergencyKit.map((item) => `• ${item}`).join('\n')}\n\nAdapt the kit for everyone in your household and follow local emergency instructions.`,
      sources: [],
      language: 'en',
    }
  }

  const guide = preparednessGuides
    .flatMap((item) => item.terms.map((term) => ({ guide: item, term: normalized(term) })))
    .sort((left, right) => right.term.length - left.term.length)
    .find(({ term }) => term && text.includes(term))?.guide
  const asksForSafetySteps = /\b(?:safety|safe|prepare|prepared|warning signs|explain|help|emergency|evacuate|caught|trapped|actions|steps|worried|risk)\b|what\s+(?:to\s+do|(?:should|do)\s+(?:i|we)\s+do)|how\s+(?:can|do|should)\s+(?:i|we)\s+(?:stay safe|prepare|protect|evacuate)|should\s+(?:i|we)\s+(?:be worried|evacuate|leave|move|stay|avoid|protect|prepare)\b/.test(text)
  const asksForDefinition = /\bwhat\s+is\b/.test(text) && !/\b(?:weather|forecast|temperature)\b/.test(text)
  const isTopicOnly = guide?.terms.some((term) => normalized(term) === text) || normalized(guide?.title) === text
  if (!guide || (!asksForSafetySteps && !asksForDefinition && !isTopicOnly)) return null

  const phase = /\b(?:during|right now|now|currently|happening|caught|trapped)\b/.test(text)
    ? 'during'
    : /\b(?:before|prepare|prepared)\b/.test(text)
      ? 'before'
      : /\bafter\b/.test(text)
        ? 'after'
        : null
  const sections = phase
    ? [[phase.toUpperCase(), guide[phase]]]
    : [['BEFORE', guide.before], ['DURING', guide.during], ['AFTER', guide.after]]
  const immediateNote = phase === 'during'
    ? 'If anyone is in immediate danger, move to safety if possible and contact local emergency services. Follow current official instructions.'
    : 'Follow current instructions from local authorities; this general guide is not an official alert.'
  const steps = sections.map(([title, items]) => `${title}:\n${items.map((item) => `• ${item}`).join('\n')}`).join('\n\n')
  return {
    reply: `${guide.title}: ${guide.summary}\n\n${immediateNote}\n\n${steps}`,
    sources: [],
    language: 'en',
  }
}

function locationOf(alert) {
  return [...new Set([alert.city, alert.district, alert.state].filter(Boolean))].join(', ')
}

function findLocationQuery(message) {
  const match = message.match(/\b(?:in|near|around|within|at|for)\s+(?:the\s+)?(?:(?:state|district|city|area)\s+of\s+)?([a-z][a-z .'-]{1,60}?)(?=\s+(?:right now|currently|today|please|show|alerts?|warnings?)\b|[?!.]|$)/i)
  if (!match) return []
  const query = match[1].trim().replace(/\s+(?:state|district|city|area)$/i, '')
  if (!query || genericLocationTerms.has(query.toLocaleLowerCase())) return []
  return query.split(/\s+(?:and|or)\s+/i).map((place) => place.trim()).filter(Boolean)
}

function findHazardQuery(message) {
  const text = normalized(message)
  return hazardTerms.find((term) => text.includes(normalized(term))) || ''
}

function canonicalizePrompt(message, language) {
  const languageCode = language === 'auto' ? detectLanguage(message).language : language
  const localized = chatLocaleText[languageCode]
  if (!localized) return message
  const input = String(message).toLocaleLowerCase().trim().replace(/\s+/g, ' ')
  const supportedPrompts = ['active', 'severity', 'mumbai', 'flood', 'cyclone', 'explain']
  const promptKey = supportedPrompts.find((key) => {
    const prompt = localized[key]
    return typeof prompt === 'string' && prompt.toLocaleLowerCase().trim().replace(/\s+/g, ' ') === input
  })
  return promptKey ? chatLocaleText.en[promptKey] : message
}

function getMatchingAlerts(alerts, message, places, hazard) {
  return alerts.filter((alert) => {
    const alertText = normalized([
      alert.disasterType, alert.title, alert.description,
      alert.city, alert.district, alert.state,
    ].join(' '))
    const matchesPlace = !places.length || places.some((place) => alertText.includes(normalized(place)))
    const matchesHazard = !hazard || alertText.includes(normalized(hazard))
    return matchesPlace && matchesHazard
  })
}

function makeSource(alert) {
  const url = alert.sourceUrl || alert.source_url
  return url ? {
    name: alert.source || 'SACHET/NDMA',
    url,
    timestamp: alert.timestamp || alert.issued_at,
  } : null
}

function uniqueSources(alerts) {
  const sources = new Map()
  for (const alert of alerts) {
    const source = makeSource(alert)
    if (source) sources.set(source.url, source)
  }
  return [...sources.values()]
}

function feedSource() {
  return [{ name: 'SACHET/NDMA All-India CAP feed', url: SACHET_RSS_URL }]
}

function appendStaleNote(reply, feed) {
  return feed.status === 'stale'
    ? `${reply}\n\nThe feed is using a cached snapshot. Open the linked CAP records to check the latest updates.`
    : reply
}

function answerAlertDetails(alert, feed) {
  const instructions = alert.safetyInstructions?.length
    ? alert.safetyInstructions.map((item) => `• ${item}`).join('\n')
    : 'No specific safety instructions were included in this CAP record.'
  const reply = [
    `${alert.disasterType}: ${alert.title}`,
    `Location: ${locationOf(alert)}`,
    `Severity: ${alert.severity}`,
    `Issued: ${alert.timestamp || alert.issued_at}`,
    `Status: ${alert.verificationStatus || alert.verification_status}`,
    `Details: ${alert.description}`,
    `Instructions in the official record:\n${instructions}`,
  ].join('\n')
  return {
    reply: appendStaleNote(reply, feed),
    sources: makeSource(alert) ? [makeSource(alert)] : feedSource(),
    language: 'en',
  }
}

function answerAlertList(alerts, feed, { places, hazard, asksSeverity }) {
  const placeLabel = places.join(', ')
  const qualifier = [hazard, placeLabel].filter(Boolean).join(' alerts in ')
  if (!alerts.length) {
    const search = [hazard, placeLabel].filter(Boolean).join(' in ')
    const reply = search
      ? `I couldn't find a current SACHET/NDMA CAP alert matching ${search}. This does not confirm that the area is safe or that no risk exists. Check local official advisories.`
      : 'The SACHET/NDMA feed currently has no unexpired public CAP alerts. Please continue to follow local official advisories.'
    return { reply: appendStaleNote(reply, feed), sources: feedSource(), language: 'en' }
  }

  if (asksSeverity) {
    const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']
    const counts = levels.map((level) => [level, alerts.filter((alert) => alert.severity === level).length]).filter(([, count]) => count)
    const highest = levels.find((level) => level !== 'UNKNOWN' && alerts.some((alert) => alert.severity === level))
    const breakdown = counts.map(([level, count]) => `${level}: ${count}`).join(' · ')
    const reply = `Among ${alerts.length} matching SACHET/NDMA alert${alerts.length === 1 ? '' : 's'}, the highest listed CAP severity is ${highest || 'UNKNOWN'}. ${breakdown}. Severity is taken from each official CAP record.${placeLabel ? ` Location filter: ${placeLabel}.` : ''}`
    return { reply: appendStaleNote(reply, feed), sources: uniqueSources(alerts), language: 'en' }
  }

  const rows = alerts.slice(0, 6).map((alert) => [
    `• ${alert.disasterType} — ${locationOf(alert)}`,
    `  Severity: ${alert.severity} · Issued: ${alert.timestamp || alert.issued_at}`,
    `  ${alert.title}`,
  ].join('\n'))
  const more = alerts.length > rows.length ? `\n…and ${alerts.length - rows.length} more. Open the alert register to see all matching records.` : ''
  const lead = qualifier
    ? `I found ${alerts.length} current SACHET/NDMA alert${alerts.length === 1 ? '' : 's'} matching ${qualifier}:`
    : `The connected SACHET/NDMA feed has ${alerts.length} current, unexpired public CAP alert${alerts.length === 1 ? '' : 's'}:`
  const reply = `${lead}\n\n${rows.join('\n')}${more}\n\nEach record is linked below. A missing match is not proof that there is no local risk.`
  return { reply: appendStaleNote(reply, feed), sources: uniqueSources(alerts.slice(0, 6)), language: 'en' }
}

function answerUnavailable() {
  return {
    reply: "I can't retrieve the live SACHET/NDMA alert feed right now, so I can't give a current alert answer. Please try again shortly or open the official feed.",
    sources: feedSource(),
    language: 'en',
  }
}

function answerUnsupported() {
  return {
    reply: 'I can check current SACHET/NDMA alerts, look up weather for a configured city, answer emergency-kit questions, and share general before/during/after guidance for common hazards. Ask about a specific hazard or city.',
    sources: [],
    language: 'en',
  }
}

export async function answerChat({ message, conversationId, alertId, language = 'auto' } = {}, {
  getFeed = () => sachetAlertCache.get(),
  getWeather = (location) => fetchOpenMeteoWeather(location, {
    timeoutMs: Number(process.env.OPEN_METEO_TIMEOUT_MS) > 0 ? Number(process.env.OPEN_METEO_TIMEOUT_MS) : 8000,
  }),
} = {}) {
  if (process.env.USE_MOCK_DATA === 'true') {
    const { answerChat: answerMockChat } = await import('../../mock/chatService.js')
    return answerMockChat({ message, conversationId, alertId, language })
  }

  const cleanMessage = String(message || '').trim()
  if (!asksForLiveAlerts(cleanMessage)) {
    const preparednessAnswer = answerPreparedness(cleanMessage)
    if (preparednessAnswer) return preparednessAnswer
  }

  if (isWeatherQuestion(cleanMessage)) {
    const location = findWeatherLocation(cleanMessage)
    if (!location) return answerWeatherLocationPrompt()
    try {
      return answerWeather(await getWeather(location), cleanMessage)
    } catch (error) {
      if (error instanceof OpenMeteoError) return answerWeatherUnavailable(location, error)
      throw error
    }
  }

  let feed
  try {
    feed = await getFeed()
  } catch (error) {
    if (error instanceof SachetSourceError) return answerUnavailable()
    throw error
  }

  if (!feed || !Array.isArray(feed.alerts)) throw new TypeError('SACHET alert service returned an invalid feed.')
  const alerts = feed.alerts
  const explicitId = alertId || cleanMessage.match(alertIdPattern)?.[0]
  const selectedAlert = explicitId && alerts.find((alert) => alert.alertId === explicitId || alert.id === explicitId)
  if (selectedAlert) return answerAlertDetails(selectedAlert, feed)
  if (explicitId) {
    return {
      reply: `I couldn't find active CAP record ${explicitId} in the current SACHET/NDMA feed. It may have expired or been removed from the active feed. Check the official feed for the latest records.`,
      sources: feedSource(),
      language: 'en',
    }
  }

  const queryMessage = canonicalizePrompt(cleanMessage, language)
  const places = findLocationQuery(queryMessage)
  const hazard = findHazardQuery(queryMessage)
  const asksSeverity = /\b(severity|severe|critical|danger level|how bad)\b/i.test(queryMessage)
  const asksForAlerts = /\b(alerts?|warnings?|advisories|notices?|hazard|risk|danger|sachet|cap|active|current|latest|severity)\b/i.test(queryMessage)
  if (!places.length && !hazard && !asksForAlerts) return answerUnsupported()

  const matchingAlerts = getMatchingAlerts(alerts, queryMessage, places, hazard)
  return answerAlertList(matchingAlerts, feed, { places, hazard, asksSeverity })
}
