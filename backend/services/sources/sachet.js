import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { z } from 'zod'
import { normalizedAlertSchema } from '../../schemas/normalized.js'

export const SACHET_ALERTS_API_URL = 'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails'
export const SACHET_RSS_URL = 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml'
const SACHET_ORIGIN = 'https://sachet.ndma.gov.in'
const CAP_SOURCE_PATH = '/cap_public_website/FetchXMLFile'
const CAP_NAMESPACE = 'urn:oasis:names:tc:emergency:cap:1.2'

const activeAlertSchema = z.object({
  identifier: z.union([z.string().min(1), z.number().int()]),
  area_description: z.string().trim().min(1),
  centroid: z.string().min(3),
  disaster_type: z.string().min(1),
  alert_source: z.string().trim().min(1),
  warning_message: z.string().trim().min(1),
}).passthrough()

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: true,
})

const severityByCapValue = {
  extreme: 'CRITICAL',
  severe: 'HIGH',
  moderate: 'MEDIUM',
  minor: 'LOW',
  unknown: 'UNKNOWN',
}

const statesAndTerritories = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttarakhand', 'Uttar Pradesh', 'West Bengal',
]

export class SachetSourceError extends Error {
  constructor(message, { status = null, url, cause, retryable = false } = {}) {
    super(message, { cause })
    this.name = 'SachetSourceError'
    this.status = status
    this.url = url
    this.retryable = retryable
  }
}

function asArray(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function xmlText(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (Array.isArray(value)) return xmlText(value[0])
  if (value && typeof value === 'object' && '#text' in value) return xmlText(value['#text'])
  return ''
}

function parseXml(xml, url) {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) {
    throw new SachetSourceError('SACHET returned malformed XML.', { status: 200, url })
  }
  try {
    return xmlParser.parse(xml)
  } catch (error) {
    throw new SachetSourceError('SACHET XML could not be parsed.', { status: 200, url, cause: error })
  }
}

function normalizeStateName(value) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

function stateFromArea(area) {
  const normalizedArea = normalizeStateName(area)
  const matches = statesAndTerritories
    .map((state) => ({ state, normalized: normalizeStateName(state) }))
    .filter(({ normalized }) => normalizedArea.includes(normalized))
    .sort((left, right) => right.normalized.length - left.normalized.length)
  return matches[0]?.state || 'India'
}

function parseCentroid(value, url) {
  const coordinates = value.split(',').map((part) => Number(part.trim()))
  if (coordinates.length !== 2 || !coordinates.every(Number.isFinite)) {
    throw new SachetSourceError('SACHET returned an invalid alert centroid.', { status: 200, url })
  }

  const [longitude, latitude] = coordinates
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new SachetSourceError('SACHET returned an out-of-range alert centroid.', { status: 200, url })
  }
  return { latitude, longitude }
}

function validateCapSourceUrl(value, identifier) {
  let url
  try {
    url = new URL(value)
  } catch (error) {
    throw new SachetSourceError('SACHET RSS item has an invalid CAP source URL.', { url: SACHET_RSS_URL, cause: error })
  }
  if (url.origin !== SACHET_ORIGIN || url.pathname !== CAP_SOURCE_PATH || url.searchParams.get('identifier') !== identifier) {
    throw new SachetSourceError('SACHET RSS item has an unexpected CAP source URL.', { url: SACHET_RSS_URL })
  }
  return url.toString()
}

async function requestText(url, {
  fetchImpl,
  method = 'GET',
  headers = {},
  timeoutMs = 8000,
  maxAttempts = 3,
  retryBaseMs = 250,
  sleep,
}) {
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error('SACHET request timed out.')), timeoutMs)
    try {
      const response = await fetchImpl(url, { method, headers, signal: controller.signal })
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500
        const error = new SachetSourceError(`SACHET returned HTTP ${response.status}.`, {
          status: response.status,
          url,
          retryable,
        })
        if (!retryable || attempt === maxAttempts) throw error
        lastError = error
      } else {
        return { body: await response.text(), status: response.status }
      }
    } catch (error) {
      if (error instanceof SachetSourceError && !error.retryable) throw error
      lastError = error instanceof SachetSourceError
        ? error
        : new SachetSourceError(
          controller.signal.aborted ? 'SACHET request timed out.' : error.message || 'SACHET request failed.',
          { url, cause: error, retryable: true },
        )
      if (attempt === maxAttempts) throw lastError
    } finally {
      clearTimeout(timeout)
    }
    await sleep(retryBaseMs * (2 ** (attempt - 1)))
  }
  throw lastError || new SachetSourceError('SACHET request failed.', { url })
}

function parseRssItems(xml) {
  const parsed = parseXml(xml, SACHET_RSS_URL)
  const items = asArray(parsed.rss?.channel?.item)
  const byIdentifier = new Map()
  for (const item of items) {
    const identifier = xmlText(item.guid)
    if (!identifier) continue
    byIdentifier.set(identifier, item)
  }
  return byIdentifier
}

function parseCapAlert(xml, apiRecord, sourceUrl, now) {
  const parsed = parseXml(xml, sourceUrl)
  const capAlert = parsed.alert
  if (!capAlert || !xmlText(capAlert.identifier) || !xmlText(capAlert.sent)) {
    throw new SachetSourceError('SACHET CAP alert is missing its identifier or issue timestamp.', { status: 200, url: sourceUrl })
  }
  if (xmlText(capAlert.status) !== 'Actual' || xmlText(capAlert.scope) !== 'Public') return null

  const info = asArray(capAlert.info).find((candidate) => xmlText(candidate.language).toLowerCase().startsWith('en')) || asArray(capAlert.info)[0]
  if (!info || !['Alert', 'Update'].includes(xmlText(capAlert.msgType))) return null

  const expiry = xmlText(info.expires)
  if (expiry && !Number.isFinite(Date.parse(expiry))) {
    throw new SachetSourceError('SACHET CAP alert has an invalid expiry timestamp.', { status: 200, url: sourceUrl })
  }
  if (expiry && Date.parse(expiry) <= now()) return null

  const severity = severityByCapValue[xmlText(info.severity).toLowerCase()]
  if (!severity) {
    throw new SachetSourceError('SACHET CAP alert has an unsupported severity value.', { status: 200, url: sourceUrl })
  }

  const areaDescriptions = asArray(info.area).map((area) => xmlText(area.areaDesc)).filter(Boolean)
  const area = areaDescriptions.join('; ') || apiRecord.area_description
  const headline = xmlText(info.headline) || apiRecord.warning_message
  const description = xmlText(info.description) || apiRecord.warning_message
  const instructions = asArray(info.instruction).map(xmlText).filter(Boolean)
  const { latitude, longitude } = parseCentroid(apiRecord.centroid, sourceUrl)
  const issuedAt = xmlText(capAlert.sent)
  const alertId = xmlText(capAlert.identifier)
  const source = apiRecord.alert_source.trim()

  const normalized = normalizedAlertSchema.parse({
    id: alertId,
    type: xmlText(info.event) || apiRecord.disaster_type,
    severity,
    location: {
      state: stateFromArea(`${area} ${source}`),
      district: area,
      lat: latitude,
      lon: longitude,
    },
    title: headline,
    description,
    issued_at: issuedAt,
    expires_at: expiry || null,
    source,
    source_url: sourceUrl,
    verification_status: 'Verified',
    confidence: 1,
    ai_summary: null,
    last_updated: issuedAt,
  })

  return {
    ...normalized,
    alertId: normalized.id,
    _id: normalized.id,
    type: normalized.type,
    disasterType: normalized.type,
    state: normalized.location.state,
    district: normalized.location.district,
    city: '',
    latitude: normalized.location.lat,
    longitude: normalized.location.lon,
    timestamp: normalized.issued_at,
    sourceUrl: normalized.source_url,
    verificationStatus: normalized.verification_status,
    confidenceScore: normalized.confidence,
    affectedArea: area,
    safetyInstructions: instructions,
    expiresAt: normalized.expires_at,
    lastUpdated: normalized.last_updated,
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

export async function fetchSachetAlerts({
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
  maxAttempts = 3,
  retryBaseMs = 250,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now = Date.now,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.')
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new RangeError('maxAttempts must be a positive integer.')

  const requestOptions = { fetchImpl, timeoutMs, maxAttempts, retryBaseMs, sleep }
  const [apiResponse, rssResponse] = await Promise.all([
    requestText(SACHET_ALERTS_API_URL, {
      ...requestOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    }),
    requestText(SACHET_RSS_URL, {
      ...requestOptions,
      headers: { Accept: 'application/rss+xml, application/xml' },
    }),
  ])

  let apiPayload
  try {
    apiPayload = JSON.parse(apiResponse.body)
  } catch (error) {
    throw new SachetSourceError('SACHET returned invalid alert JSON.', {
      status: apiResponse.status,
      url: SACHET_ALERTS_API_URL,
      cause: error,
    })
  }

  let apiRecords
  try {
    apiRecords = z.array(activeAlertSchema).parse(apiPayload)
  } catch (error) {
    throw new SachetSourceError('SACHET returned an unexpected alert response format.', {
      status: apiResponse.status,
      url: SACHET_ALERTS_API_URL,
      cause: error,
    })
  }
  const rssItems = parseRssItems(rssResponse.body)
  const alerts = await mapWithConcurrency(apiRecords, 4, async (record) => {
    const identifier = String(record.identifier)
    const item = rssItems.get(identifier)
    if (!item) {
      throw new SachetSourceError('SACHET RSS feed does not contain an active alert record.', {
        status: rssResponse.status,
        url: SACHET_RSS_URL,
      })
    }
    const sourceUrl = validateCapSourceUrl(xmlText(item.link), identifier)
    const capResponse = await requestText(sourceUrl, {
      ...requestOptions,
      headers: { Accept: 'application/xml, text/xml' },
    })
    try {
      return parseCapAlert(capResponse.body, record, sourceUrl, now)
    } catch (error) {
      if (error instanceof SachetSourceError) throw error
      throw new SachetSourceError('SACHET CAP alert could not be normalized.', {
        status: capResponse.status,
        url: sourceUrl,
        cause: error,
      })
    }
  })

  return alerts.filter(Boolean)
}
