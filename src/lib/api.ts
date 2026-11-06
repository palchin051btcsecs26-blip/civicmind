import { useCallback, useEffect, useState } from 'react'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    if (payload && typeof payload === 'object' && 'error' in payload) {
      message = String((payload as { error: unknown }).error)
    }
    throw new ApiError(message, res.status)
  }
  return payload as T
}

interface ApiState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

/** Small fetch hook with abort handling and manual reload. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!path) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    let active = true
    setLoading(true)
    setError(null)

    api<T>(path)
      .then((payload) => {
        if (!active) return
        setData(payload)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Could not reach the CivicMind service.')
        setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [path, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, error, loading, reload }
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'All') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
