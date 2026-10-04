import { apiFetch } from "./base"
import type { Invitation } from "./auth"

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired"

export interface ApprovalRequest {
  id: string
  session_id: string
  agent_id: string
  agent_name: string
  agent_icon: string
  tool_name: string
  tool_args: Record<string, unknown>
  summary: string
  status: ApprovalStatus
  response_note: string | null
  created_at: string
  resolved_at: string | null
  expires_at: string
}

export const approvals = {
  list: (orgId: string, resolved = false): Promise<ApprovalRequest[]> =>
    apiFetch(`/approvals/?org_id=${orgId}&resolved=${resolved}`),

  count: (orgId: string): Promise<{ count: number }> =>
    apiFetch(`/approvals/count?org_id=${orgId}`),

  approve: (id: string, note = ""): Promise<ApprovalRequest> =>
    apiFetch(`/approvals/${id}/approve`, { method: "POST", body: JSON.stringify({ note }) }),

  reject: (id: string, note = ""): Promise<ApprovalRequest> =>
    apiFetch(`/approvals/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) }),
}

// ── Invitations ───────────────────────────────────────────────────────────────

export const invitations = {
  /** Invitations pending for the current user's email */
  listMine: (): Promise<Invitation[]> => apiFetch("/invitations/mine"),

  /** Owner: invite someone by email */
  create: (orgId: string, email: string): Promise<{ id: string }> =>
    apiFetch(`/organizations/${orgId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  /** Accept an invitation by id */
  accept: (invitationId: string): Promise<{ ok: boolean }> =>
    apiFetch(`/invitations/${invitationId}/accept`, { method: "POST" }),
}

// ── Skills ────────────────────────────────────────────────────────────────────

export type SkillCategory = "Behaviour" | "Output" | "Safety" | "Domain" | "Custom"

export interface Skill {
  id: string
  org_id: string
  key: string | null
  name: string
  tagline: string
  category: SkillCategory
  content: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export type OwnerNote = {
  id: string
  org_id: string
  created_by: string
  body: string
  agent_ids: string[] | null
  expires_at: string | null
  agent_resolvable: boolean
  resolved_at: string | null
  resolved_by: string | null
  resolution: string
  created_at: string
  updated_at: string
}

export const notes = {
  list: (orgId: string): Promise<OwnerNote[]> =>
    apiFetch(`/notes?org_id=${orgId}`),

  create: (orgId: string, data: {
    body: string
    agent_ids?: string[] | null
    expires_at?: string | null
    agent_resolvable?: boolean
  }): Promise<OwnerNote> =>
    apiFetch("/notes", { method: "POST", body: JSON.stringify({ org_id: orgId, ...data }) }),

  update: (id: string, data: {
    body?: string
    agent_ids?: string[] | null
    expires_at?: string | null
    agent_resolvable?: boolean
  }): Promise<OwnerNote> =>
    apiFetch(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  reopen: (id: string): Promise<OwnerNote> =>
    apiFetch(`/notes/${id}/reopen`, { method: "POST" }),

  delete: (id: string): Promise<void> =>
    apiFetch(`/notes/${id}`, { method: "DELETE" }),
}

export const skills = {
  list: (orgId: string): Promise<Skill[]> =>
    apiFetch(`/skills?org_id=${orgId}`),

  create: (orgId: string, data: { name: string; tagline?: string; category?: string; content: string }): Promise<Skill> =>
    apiFetch("/skills", { method: "POST", body: JSON.stringify({ org_id: orgId, ...data }) }),

  update: (id: string, data: Partial<Pick<Skill, "name" | "tagline" | "category" | "content">>): Promise<Skill> =>
    apiFetch(`/skills/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  delete: (id: string): Promise<void> =>
    apiFetch(`/skills/${id}`, { method: "DELETE" }),

  // Agent attach / detach
  listForAgent: (agentId: string): Promise<Skill[]> =>
    apiFetch(`/skills/agent/${agentId}`),

  attach: (agentId: string, skillId: string): Promise<void> =>
    apiFetch(`/skills/agent/${agentId}/${skillId}`, { method: "POST" }),

  detach: (agentId: string, skillId: string): Promise<void> =>
    apiFetch(`/skills/agent/${agentId}/${skillId}`, { method: "DELETE" }),
}

