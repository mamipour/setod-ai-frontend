import { apiFetch } from "./base"

export interface ApiToken {
  id: string
  name: string
  token_prefix: string
  scope: "read" | "write"
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

export interface ApiTokenCreated extends ApiToken {
  token: string
}

export interface McpInfo {
  url: string
  enabled: boolean
  guide_version: number
}

export const mcp = {
  info: (orgId: string) => apiFetch<McpInfo>(`/mcp/info?org_id=${orgId}`),
  listTokens: (orgId: string) => apiFetch<ApiToken[]>(`/mcp/tokens?org_id=${orgId}`),
  createToken: (body: { org_id: string; name: string; scope: "read" | "write"; expires_in_days: number | null }) =>
    apiFetch<ApiTokenCreated>(`/mcp/tokens`, { method: "POST", body: JSON.stringify(body) }),
  revokeToken: (id: string) => apiFetch<void>(`/mcp/tokens/${id}`, { method: "DELETE" }),
}
