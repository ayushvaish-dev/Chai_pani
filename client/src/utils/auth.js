const STORAGE_KEY = 'chai_hisaab_auth'
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function buildRequestUrl(path) {
  const requestPath = String(path || '').trim()

  if (!requestPath) {
    return API_BASE_URL
  }

  if (/^https?:\/\//i.test(requestPath)) {
    return requestPath
  }

  if (!API_BASE_URL) {
    return requestPath
  }

  return `${API_BASE_URL}${requestPath.startsWith('/') ? requestPath : `/${requestPath}`}`
}

export function getAuthState() {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return { token: '', user: null }
  }

  try {
    return JSON.parse(raw)
  } catch {
    return { token: '', user: null }
  }
}

export function setAuthState(authState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(authState))
}

export function clearAuthState() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function authRequest(path, options = {}) {
  const { token } = getAuthState()
  const { headers: optionHeaders = {}, ...restOptions } = options
  const requestUrl = buildRequestUrl(path)

  const response = await fetch(requestUrl, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...optionHeaders,
    },
  })

  const contentType = response.headers.get('content-type') || ''
  const isJsonResponse = contentType.includes('application/json')
  const data = isJsonResponse
    ? await response.json().catch(() => ({
        success: false,
        message: 'Unexpected server response',
      }))
    : {
        success: false,
        message:
          response.status === 502
            ? `Backend server is not reachable at ${API_BASE_URL || 'the configured API URL'}.`
            : (await response.text().catch(() => '')).trim() || 'Unexpected server response',
      }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthState()
    }
    throw new Error(data.message || 'Request failed')
  }

  return data
}