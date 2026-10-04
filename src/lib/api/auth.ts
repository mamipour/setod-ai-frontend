import { API_BASE, apiFetch } from "./base"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrgMembership {
  id: string
  name: string
  slug: string
  role: "owner" | "member"
}

export interface CurrentUser {
  id: string
  email: string
  name: string
  avatar_url: string | null
  is_staff: boolean
  organizations: OrgMembership[]
}

export interface Invitation {
  id: string
  organization_id: string
  organization_name: string
  invited_by_name: string
  role: "owner" | "member"
  created_at: string
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  /** Redirect browser to Google login (handled by FastAPI) */
  loginWithGoogle: () => {
    window.location.href = `${API_BASE}/auth/google/login`
  },

  me: (): Promise<CurrentUser> => apiFetch("/auth/me"),

  logout: (): Promise<{ ok: boolean }> =>
    apiFetch("/auth/logout", { method: "POST" }),
}

