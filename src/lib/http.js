const isJsonResponse = (res) => {
  const contentType = res.headers.get('content-type')
  return contentType != null && contentType.includes('application/json')
}

export async function httpJson(url, { method = 'GET', headers, body, token } = {}) {
  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    const message = e?.message ? String(e.message) : 'Network error'
    throw new Error(
      `Network error calling ${method} ${url}. ` +
        `Check that the backend is running and reachable (and that HTTPS pages are not calling HTTP APIs). ` +
        `Original error: ${message}`
    )
  }

  const payload = isJsonResponse(res) ? await res.json() : await res.text()
  if (!res.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message || payload?.error || res.statusText
    const err = new Error(message)
    err.status = res.status
    err.payload = payload
    throw err
  }
  return payload
}
