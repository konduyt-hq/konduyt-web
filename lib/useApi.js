'use client'
import { useAuth } from './auth-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export function useApi() {
  const { token } = useAuth()

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const r = await fetch(API + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!r.ok) {
      let msg = `Request failed: ${r.status}`
      try {
        const err = await r.json()
        msg = err.error?.message || err.detail || msg
      } catch {}
      throw new Error(msg)
    }

    const text = await r.text()
    return text ? JSON.parse(text) : null
  }

  return {
    get:   (path)        => request('GET',    path),
    post:  (path, body)  => request('POST',   path, body),
    patch: (path, body)  => request('PATCH',  path, body),
    put:   (path, body)  => request('PUT',    path, body),
    del:   (path)        => request('DELETE', path),
  }
}
