import { fetchSachetAlerts, SachetSourceError } from './sources/sachet.js'

export const SACHET_REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function createSachetAlertCache({
  fetchAlerts = fetchSachetAlerts,
  now = Date.now,
  ttlMs = SACHET_REFRESH_INTERVAL_MS,
  onError = (error) => console.error(JSON.stringify({
    source: 'SACHET/NDMA',
    status: error.status ?? null,
    url: error.url || null,
    message: error.message || 'SACHET request failed.',
  })),
} = {}) {
  let snapshot = null
  let lastError = null
  let pendingRefresh = null
  let retryAfter = 0

  const result = (status, warning = '') => ({
    alerts: (snapshot?.alerts || []).filter((alert) => !alert.expires_at || Date.parse(alert.expires_at) > now()),
    source: 'SACHET/NDMA CAP',
    status,
    latestAlertIssuedAt: snapshot?.latestAlertIssuedAt || null,
    warning,
  })

  const refresh = async () => {
    if (pendingRefresh) return pendingRefresh
    pendingRefresh = (async () => {
      try {
        const alerts = await fetchAlerts()
        snapshot = {
          alerts,
          fetchedAt: now(),
          latestAlertIssuedAt: alerts
            .map((alert) => alert.issued_at)
            .sort((left, right) => Date.parse(right) - Date.parse(left))[0] || null,
        }
        lastError = null
        retryAfter = 0
        return result('connected')
      } catch (error) {
        lastError = error
        retryAfter = now() + 60_000
        onError(error)
        if (snapshot) return result('stale', 'SACHET/NDMA is unavailable; showing the last successful feed snapshot.')
        throw error instanceof SachetSourceError
          ? error
          : new SachetSourceError('SACHET/NDMA alert feed is unavailable.', { cause: error })
      } finally {
        pendingRefresh = null
      }
    })()
    return pendingRefresh
  }

  return {
    async get() {
      const age = snapshot ? now() - snapshot.fetchedAt : Infinity
      if (snapshot && !lastError && age < ttlMs) return result('connected')
      if (lastError && now() < retryAfter) {
        if (snapshot) return result('stale', 'SACHET/NDMA is unavailable; showing the last successful feed snapshot.')
        throw lastError
      }
      return refresh()
    },
    refresh,
    status() {
      if (pendingRefresh && !snapshot) return { status: 'connecting', latestAlertIssuedAt: null }
      if (!snapshot) return { status: lastError ? 'unavailable' : 'connecting', latestAlertIssuedAt: null }
      const stale = Boolean(lastError) || now() - snapshot.fetchedAt >= ttlMs
      return { status: stale ? 'stale' : 'connected', latestAlertIssuedAt: snapshot.latestAlertIssuedAt }
    },
  }
}

export const sachetAlertCache = createSachetAlertCache()

export function startSachetAlertScheduler(cache = sachetAlertCache) {
  const timer = setInterval(() => { cache.refresh().catch(() => {}) }, SACHET_REFRESH_INTERVAL_MS)
  timer.unref()
  cache.refresh().catch(() => {})
  return timer
}
