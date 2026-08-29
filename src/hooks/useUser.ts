"use client"

import { useEffect, useState } from "react"
import { auth, type CurrentUser } from "@/lib/api"

interface UseUserResult {
  user: CurrentUser | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    auth
      .me()
      .then((u) => {
        if (!cancelled) {
          setUser(u)
          setError(null)
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setUser(null)
          setError(e.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  return { user, loading, error, refetch: () => setTick((t) => t + 1) }
}
