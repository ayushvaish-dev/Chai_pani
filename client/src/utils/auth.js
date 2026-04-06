const STORAGE_KEY = 'chai_hisaab_auth'

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

  const response = await fetch(path, {
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
            ? 'Backend server is not reachable. Check that the API is running on port 5000.'
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