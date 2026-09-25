"use client"

/**
 * Active-workspace context.
 *
 * A user can belong to multiple organisations. This context tracks which one
 * is currently active and persists the choice to localStorage so it survives
 * page refreshes. The sidebar workspace-picker writes here; every page reads here
 * instead of hardcoding `user.organizations[0]`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { OrgMembership } from "@/lib/api"
import { useUser } from "@/hooks/useUser"

const STORAGE_KEY = "setod:active_org_id"

interface ActiveOrgContextValue {
  /** The currently selected organisation (null while the user is loading). */
  activeOrg: OrgMembership | null
  /** Switch to a different organisation. Persists the choice. */
  setActiveOrgId: (id: string) => void
  /** All organisations the signed-in user belongs to. */
  orgs: OrgMembership[]
  /** Re-fetch user data (e.g. after creating a workspace). */
  reload: () => void
}

const ActiveOrgContext = createContext<ActiveOrgContextValue>({
  activeOrg: null,
  setActiveOrgId: () => {},
  orgs: [],
  reload: () => {},
})

export function ActiveOrgProvider({ children }: { children: React.ReactNode }) {
  const { user, refetch } = useUser()
  const orgs: OrgMembership[] = user?.organizations ?? []

  const [activeId, setActiveId] = useState<string | null>(null)

  // On first load: restore from localStorage, fall back to first org.
  useEffect(() => {
    if (orgs.length === 0) return
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    const valid = stored && orgs.some((o) => o.id === stored)
    setActiveId(valid ? stored! : orgs[0].id)
  }, [orgs.map((o) => o.id).join(",")]) // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveOrgId = useCallback((id: string) => {
    setActiveId(id)
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const activeOrg = useMemo(
    () => (activeId ? (orgs.find((o) => o.id === activeId) ?? orgs[0] ?? null) : (orgs[0] ?? null)),
    [activeId, orgs]
  )

  return (
    <ActiveOrgContext.Provider value={{ activeOrg, setActiveOrgId, orgs, reload: refetch }}>
      {children}
    </ActiveOrgContext.Provider>
  )
}

/** Convenience hook — returns the active org, setter, and full list. */
export function useActiveOrg() {
  return useContext(ActiveOrgContext)
}
