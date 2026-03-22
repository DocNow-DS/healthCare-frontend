const isJsonResponse = (res) => {
  const contentType = res.headers.get('content-type')
  return contentType != null && contentType.includes('application/json')
}

export async function httpJson(url, { method = 'GET', headers, body, token } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })

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
