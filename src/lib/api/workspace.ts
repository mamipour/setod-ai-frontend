import { apiFetch } from "./base"

export interface WebSearchSettings {
  provider: "duckduckgo" | "tavily"
  tavily_key_set: boolean
}

export interface TimezoneSettings {
  timezone: string
}

// ── Workspace graph (read-only map) ───────────────────────────────────────────

export interface GraphNode {
  id: string
  kind: "agent" | "connector"
  name: string
  icon?: string | null
  status?: string | null
  model?: string | null
  schedule?: string | null
  last_run_at?: string | null
  last_run_status?: string | null
  runs_24h: number
  running: boolean
  type?: string | null
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  kind: "uses" | "trigger" | "calls"
  label?: string | null
  active: boolean
  count_24h: number
}

export interface WorkspaceGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  generated_at: string
  window_hours: number
}

export const workspace = {
  getGraph: (orgId: string): Promise<WorkspaceGraph> =>
    apiFetch(`/workspace/${orgId}/graph`),

  getTimezone: (orgId: string): Promise<TimezoneSettings> =>
    apiFetch(`/workspace/${orgId}/timezone`),

  updateTimezone: (orgId: string, timezone: string): Promise<TimezoneSettings> =>
    apiFetch(`/workspace/${orgId}/timezone`, {
      method: "PATCH",
      body: JSON.stringify({ timezone }),
    }),

  getWebSearch: (orgId: string): Promise<WebSearchSettings> =>
    apiFetch(`/workspace/${orgId}/web-search`),

  updateWebSearch: (
    orgId: string,
    data: { provider: "duckduckgo" | "tavily"; tavily_api_key?: string },
  ): Promise<WebSearchSettings> =>
    apiFetch(`/workspace/${orgId}/web-search`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  testWebSearch: (orgId: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch(`/workspace/${orgId}/web-search/test`, { method: "POST" }),

  getNotify: (orgId: string): Promise<{ telegram_connector_id: string | null }> =>
    apiFetch(`/workspace/${orgId}/notify`),

  updateNotify: (
    orgId: string,
    data: { telegram_connector_id: string | null },
  ): Promise<{ telegram_connector_id: string | null }> =>
    apiFetch(`/workspace/${orgId}/notify`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  testNotify: (orgId: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch(`/workspace/${orgId}/notify/test`, { method: "POST" }),

  // ── Members ───────────────────────────────────────────────────────────────
  listMembers: (orgId: string): Promise<{ user_id: string; email: string; name: string; role: string }[]> =>
    apiFetch(`/workspace/${orgId}/members`),

  inviteMember: (orgId: string, email: string, role: "owner" | "member"): Promise<{ ok: boolean; detail: string }> =>
    apiFetch(`/workspace/${orgId}/members/invite`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  changeMemberRole: (orgId: string, userId: string, role: "owner" | "member"): Promise<{ user_id: string; email: string; name: string; role: string }> =>
    apiFetch(`/workspace/${orgId}/members/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  removeMember: (orgId: string, userId: string): Promise<void> =>
    apiFetch(`/workspace/${orgId}/members/${userId}`, { method: "DELETE" }),

  // ── Data retention ────────────────────────────────────────────────────────
  getRetention: (orgId: string): Promise<{ data_retention_days: number | null; scrub_content_only: boolean }> =>
    apiFetch(`/workspace/${orgId}/retention`),

  updateRetention: (
    orgId: string,
    data: { data_retention_days: number | null; scrub_content_only: boolean },
  ): Promise<{ data_retention_days: number | null; scrub_content_only: boolean }> =>
    apiFetch(`/workspace/${orgId}/retention`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // ── Workspace CRUD ────────────────────────────────────────────────────────
  createWorkspace: (name: string): Promise<{ id: string; name: string; slug: string }> =>
    apiFetch("/workspace/", { method: "POST", body: JSON.stringify({ name }) }),

  renameWorkspace: (orgId: string, name: string): Promise<{ id: string; name: string; slug: string }> =>
    apiFetch(`/workspace/${orgId}`, { method: "PATCH", body: JSON.stringify({ name }) }),

  // ── Invitation management ─────────────────────────────────────────────────
  listInvitations: (orgId: string): Promise<{
    id: string; email: string; role: string;
    created_at: string; expires_at: string; accepted: boolean
  }[]> =>
    apiFetch(`/workspace/${orgId}/invitations`),

  withdrawInvitation: (orgId: string, invitationId: string): Promise<void> =>
    apiFetch(`/workspace/${orgId}/invitations/${invitationId}`, { method: "DELETE" }),

  // ── Leave workspace ───────────────────────────────────────────────────────
  leaveWorkspace: (orgId: string): Promise<void> =>
    apiFetch(`/workspace/${orgId}/members/me`, { method: "DELETE" }),
}

// ── Conversations ─────────────────────────────────────────────────────────────

