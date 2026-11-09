const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export async function request(path, options = {}) {
  const token = options.token || localStorage.getItem('dah-token')
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

export { API_URL }