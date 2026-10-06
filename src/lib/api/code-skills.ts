import { apiFetch } from "./base"

export type CodeSkillDeployStatus = "draft" | "deploying" | "ready" | "failed"

export interface CodeSkill {
  id: string
  org_id: string
  name: string
  tagline: string
  tool_name: string
  tool_description: string
  input_schema: Record<string, unknown>
  source: string
  timeout_seconds: number
  network_access: boolean
  read_only: boolean
  deploy_status: CodeSkillDeployStatus
  dirty: boolean
  has_secrets: boolean
  lambda_function_name: string | null
  last_deploy_error: string | null
  last_deployed_at: string | null
  invocation_count: number
  last_invoked_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface AgentCodeSkill extends CodeSkill {
  requires_approval: boolean
}

export interface CodeSkillTestResult {
  ok: boolean
  result?: unknown
  error?: string
  duration_ms: number
  log_tail: string | null
}

export interface CodeSkillInput {
  name: string
  tagline: string
  tool_name: string
  tool_description: string
  input_schema: Record<string, unknown>
  source: string
  timeout_seconds: number
  network_access: boolean
  read_only: boolean
}

export const codeSkills = {
  list: (orgId: string) => apiFetch<CodeSkill[]>(`/code-skills?org_id=${orgId}`),
  get: (id: string) => apiFetch<CodeSkill>(`/code-skills/${id}`),
  create: (orgId: string, data: CodeSkillInput) =>
    apiFetch<CodeSkill>("/code-skills", { method: "POST", body: JSON.stringify({ org_id: orgId, ...data }) }),
  update: (id: string, data: Partial<CodeSkillInput>) =>
    apiFetch<CodeSkill>(`/code-skills/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<void>(`/code-skills/${id}`, { method: "DELETE" }),
  deploy: (id: string) => apiFetch<{ deploy_id: string }>(`/code-skills/${id}/deploy`, { method: "POST" }),
  test: (id: string, input: unknown) =>
    apiFetch<CodeSkillTestResult>(`/code-skills/${id}/test`, { method: "POST", body: JSON.stringify({ input }) }),
  secretKeys: (id: string) => apiFetch<{ keys: string[] }>(`/code-skills/${id}/secrets`),
  putSecrets: (id: string, secrets: Record<string, string>) =>
    apiFetch<{ keys: string[] }>(`/code-skills/${id}/secrets`, { method: "PUT", body: JSON.stringify({ secrets }) }),
  deploys: (id: string) => apiFetch<unknown[]>(`/code-skills/${id}/deploys`),
  listForAgent: (agentId: string) => apiFetch<AgentCodeSkill[]>(`/code-skills/agent/${agentId}`),
  attach: (agentId: string, skillId: string, requiresApproval: boolean) =>
    apiFetch<void>(`/code-skills/agent/${agentId}/${skillId}`, {
      method: "PUT",
      body: JSON.stringify({ requires_approval: requiresApproval }),
    }),
  detach: (agentId: string, skillId: string) =>
    apiFetch<void>(`/code-skills/agent/${agentId}/${skillId}`, { method: "DELETE" }),
}
