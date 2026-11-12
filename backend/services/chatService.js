import { chatLocaleText } from '../../shared/chatLocaleText.js'
import { detectLanguage } from './languageDetection.js'
import { SACHET_RSS_URL, SachetSourceError } from './sources/sachet.js'
import { sachetAlertCache } from './sachetAlertCache.js'

const alertIdPattern = /\bIN-\d+_\d+\b/i
const hazardTerms = [
  'flood', 'flooding', 'cyclone', 'rain', 'storm', 'lightning', 'avalanche',
  'landslide', 'earthquake', 'fire', 'heatwave', 'tsunami', 'wind',
]
const genericLocationTerms = new Set(['me', 'my area', 'here', 'there', 'india'])

function normalized(value) {
  return String(value || '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
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
    reply: 'I can look up current SACHET/NDMA alerts by location or hazard, summarize CAP severity, or explain a specific alert. I only use information present in the official alert records; I don’t provide general safety guidance unless it appears in a linked alert.',
    sources: feedSource(),
    language: 'en',
  }
}

export async function answerChat({ message, conversationId, alertId, language = 'auto' } = {}, { getFeed = () => sachetAlertCache.get() } = {}) {
  if (process.env.USE_MOCK_DATA === 'true') {
    const { answerChat: answerMockChat } = await import('../../mock/chatService.js')
    return answerMockChat({ message, conversationId, alertId, language })
  }

  const cleanMessage = String(message || '').trim()
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
