import { getToken } from './supabase'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export async function api(method, path, body) {
  const token = await getToken()
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const get   = (path)       => api('GET',    path)
export const post  = (path, body) => api('POST',   path, body)
export const patch = (path, body) => api('PATCH',  path, body)
export const del   = (path)       => api('DELETE', path)
