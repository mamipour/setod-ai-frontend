"use client"

import { useCallback, useEffect, useState } from "react"
import { agents, type Agent } from "@/lib/api"

interface UseAgentsResult {
  list: Agent[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAgents(orgId: string): UseAgentsResult {
  const [list, setList] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // The effect never raises the loading flag; it starts raised and `refetch` raises it again.
  // Setting it inside the effect would re-render before the request has even gone out.
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    agents
      .list(orgId)
      .then((rows) => {
        if (!cancelled) {
          setList(rows)
          setError(null)
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgId, tick])

  return {
    list,
    loading,
    error,
    refetch: useCallback(() => {
      setLoading(true)
      setTick((t) => t + 1)
    }, []),
  }
}

interface UseAgentResult {
  agent: Agent | null
  loading: boolean
  error: string | null
  /** Applies a change locally straight away, so autosaved fields do not flicker. */
  patch: (changes: Partial<Agent>) => void
  refetch: () => void
}

export function useAgent(agentId: string): UseAgentResult {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!agentId) return
    let cancelled = false
    agents
      .get(agentId)
      .then((a) => {
        if (!cancelled) {
          setAgent(a)
          setError(null)
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [agentId, tick])

  return {
    agent,
    loading,
    error,
    patch: useCallback(
      (changes: Partial<Agent>) => setAgent((a) => (a ? { ...a, ...changes } : a)),
      [],
    ),
    refetch: useCallback(() => setTick((t) => t + 1), []),
  }
}

