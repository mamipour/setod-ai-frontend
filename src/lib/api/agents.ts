import { API_BASE, apiFetch } from "./base"
import type { ConnectorType, ConnectorStatus } from "./connectors"

export type AgentStatus = "draft" | "published" | "paused"
export type TriggerType = "schedule" | "channel" | "manual" | "agent" | "phone"
export type SessionStatus = "running" | "succeeded" | "error" | "waiting_approval"
export type MessageRole = "user" | "assistant" | "tool" | "system"

export type MediaKindPolicy = "auto" | "skip"

export interface MediaPolicy {
  /** Audio messages (voice notes). "auto" = Whisper transcription. Default: skip. */
  audio: MediaKindPolicy
  /** Images. "auto" = GPT-4o-mini one-paragraph description. Default: skip. */
  image: MediaKindPolicy
  /** Video. "auto" = marker only (no processing today). Default: skip. */
  video: MediaKindPolicy
  /** Documents (.pdf .txt .md .csv). "auto" = text extraction (no API cost). Default: auto. */
  document: MediaKindPolicy
}

export const DEFAULT_MEDIA_POLICY: MediaPolicy = {
  audio: "skip",
  image: "skip",
  video: "skip",
  document: "auto",
}

export interface AgentSettings {
  max_iterations: number
  tool_concurrency: number
  web_search: boolean
  web_search_provider: string
  live_page_access: boolean
  search_context: "low" | "medium" | "high"
  reasoning: boolean
  episodic_memory: boolean
  /** Key-value memory tools (memory_get/set/delete/list). Default on. */
  kv_memory: boolean
  daily_token_budget: number
  /**
   * Controls which inbound media kinds are processed before a run.
   * "auto" = processed (Whisper / vision / extract). "skip" = stored + marker, no API call.
   * Default for audio/image/video is "skip". Document defaults to "auto" (no API cost).
   */
  media_policy: MediaPolicy
}

/** One key-value memory entry. `key` carries the `shared:` prefix for workspace-wide rows. */
export interface MemoryEntry {
  key: string
  shared: boolean
  value: unknown
  updated_at: string
  updated_by_session_id: string | null
}

export interface Agent {
  id: string
  org_id: string
  name: string
  icon: string
  instructions: string
  template_key: string | null
  model_connector_id: string | null
  model: string
  status: AgentStatus
  settings: AgentSettings
  has_unpublished_changes: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  /** 0.0–1.0 fraction of last 20 runs that succeeded. null = no runs yet. */
  health_score: number | null
  /** ISO timestamp of the most recent non-dry run. null = never run. */
  last_run_at: string | null
  /** TriggerType of the first enabled trigger, or null if none configured yet. */
  primary_trigger_type: TriggerType | null
  /** Connector types wired to this agent (LLM providers excluded). */
  connector_types: ConnectorType[]
}

export interface AgentTemplate {
  key: string
  name: string
  icon: string
  tagline: string
  description: string
  instructions: string
  /** Section heading on the Templates page. The API returns templates already grouped by it. */
  category: string
  required_connectors: ConnectorType[]
  optional_connectors: ConnectorType[]
  trigger_type: TriggerType
  schedule_preset: string | null
  settings: Partial<AgentSettings>
  /** Required connector types this workspace has not connected yet. */
  missing_connectors: ConnectorType[]
  ready: boolean
  /** Tools to enable by default per connector type. Empty = all tools on. */
  default_tools: Partial<Record<ConnectorType, string[]>>
}

export interface ModelList {
  models: { id: string; label: string }[]
  default?: string
  detail?: string
}

export type ManagedProvider = "openai" | "anthropic"

export interface PlatformModels {
  models: { id: string; label: string; provider: string }[]
  /** False when the org's plan doesn't include managed models. */
  available: boolean
  /** Providers Setod has a platform key for (and at least one priced model). */
  providers?: ManagedProvider[]
  /** Cheapest priced model per provider; set when the user picks "<Provider> (Managed)". */
  defaults?: Partial<Record<ManagedProvider, string | null>>
}

export const EMPTY_PLATFORM_MODELS: PlatformModels = { models: [], available: false, providers: [], defaults: {} }

export interface Tool {
  name: string
  description: string
  enabled: boolean
  requires_approval: boolean
}

export interface AgentTool {
  id: string
  connector_id: string
  connector_name: string
  connector_type: ConnectorType
  connector_status: ConnectorStatus
  alias: string
  tools: Tool[]
}

export interface Trigger {
  id: string
  type: TriggerType
  config: Record<string, unknown>
  enabled: boolean
  summary: string
  last_run_at: string | null
  next_run_at: string | null
}

export interface SchedulePreset {
  key: string
  cron: string
  label: string
}

export interface Session {
  id: string
  agent_id: string
  trigger_type: TriggerType
  status: SessionStatus
  name: string
  model_slug: string
  dry_run: boolean
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  iterations: number
  error: string | null
  started_at: string
  finished_at: string | null
  triggered_by_session_id: string | null
  triggered_by_agent_name: string | null
}

export interface AgentLink {
  id: string
  agent_id: string
  target_agent_id: string
  target_agent_name: string
  target_agent_status: string
  description: string
  created_at: string
}

export interface Scenario {
  id: string
  agent_id: string
  name: string
  input_text: string
  expected_tools: string[]
  last_session_id: string | null
  last_ran_at: string | null
  created_at: string
}

export interface SessionMessage {
  id: string
  sequence: number
  role: MessageRole
  content: string
  tool_name: string | null
  tool_args: Record<string, unknown> | null
  created_at: string
}

export interface SessionDetail extends Session {
  messages: SessionMessage[]
}

export interface OverviewSession extends Session {
  agent_name: string
  agent_icon: string
}

export interface DailyRuns {
  date: string
  runs: number
  failures: number
}

export type KnowledgeFileStatus = "pending" | "processing" | "ready" | "error"

/** A SQL table derived from a CSV/XLSX upload; the agent queries it with `query_data`. */
export interface DataTable {
  name: string
  sheet: string | null
  row_count: number
  column_count: number
}

export interface KnowledgeFile {
  id: string
  filename: string
  size_bytes: number
  status: KnowledgeFileStatus
  error: string | null
  chunk_count: number
  source_url: string | null
  created_at: string
  tables: DataTable[]
}

export interface Overview {
  agents_live: number
  agents_total: number
  runs_today: number
  failures_today: number
  tokens_today: number
  /** Accurate per-model spend in USD (computed server-side). */
  spend_today: number
  runs_yesterday: number
  failures_yesterday: number
  tokens_yesterday: number
  /** Accurate per-model spend in USD for yesterday (computed server-side). */
  spend_yesterday: number
  daily_runs: DailyRuns[]
  recent_sessions: OverviewSession[]
}

export const agents = {
  list: (orgId: string): Promise<Agent[]> => apiFetch(`/agents/?org_id=${orgId}`),

  get: (id: string): Promise<Agent> => apiFetch(`/agents/${id}`),

  create: (body: {
    org_id: string
    name?: string
    icon?: string
    instructions?: string
    template_key?: string | null
    model_connector_id?: string | null
    model?: string
    settings?: Partial<AgentSettings>
  }): Promise<Agent> =>
    apiFetch("/agents/", { method: "POST", body: JSON.stringify(body) }),

  /** PATCH not PUT  -  the builder autosaves one field at a time. */
  update: (
    id: string,
    body: Partial<{
      name: string
      icon: string
      instructions: string
      model_connector_id: string | null
      model: string
      settings: Partial<AgentSettings>
    }>,
  ): Promise<Agent> =>
    apiFetch(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (id: string): Promise<void> => apiFetch(`/agents/${id}`, { method: "DELETE" }),

  publish: (id: string): Promise<Agent> => apiFetch(`/agents/${id}/publish`, { method: "POST" }),

  unpublish: (id: string): Promise<Agent> =>
    apiFetch(`/agents/${id}/unpublish`, { method: "POST" }),
  pause: (id: string): Promise<Agent> =>
    apiFetch(`/agents/${id}/pause`, { method: "POST" }),
  resume: (id: string): Promise<Agent> =>
    apiFetch(`/agents/${id}/resume`, { method: "POST" }),

  /** Runs are real by default  -  actions are performed, not simulated. Pass dry_run: true
      explicitly if a simulated preview is ever wanted. */
  run: (
    id: string,
    orgId: string,
    opts: { message?: string; dry_run?: boolean; use_draft?: boolean } = {},
  ): Promise<Session> =>
    apiFetch(`/agents/${id}/run`, {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, dry_run: false, ...opts }),
    }),

  templates: (orgId: string): Promise<AgentTemplate[]> =>
    apiFetch(`/agents/templates?org_id=${orgId}`),

  /** Empty `models` means the provider could not be reached; fall back to its default. */
  models: (connectorId: string): Promise<ModelList> =>
    apiFetch(`/agents/models?connector_id=${connectorId}`),

  /** Setod-managed models available for this org (requires managed_models entitlement). */
  platformModels: (orgId: string): Promise<PlatformModels> =>
    apiFetch(`/agents/platform-models?org_id=${orgId}`),

  schedulePresets: (): Promise<SchedulePreset[]> => apiFetch("/agents/schedule-presets"),

  /** Everything the dashboard needs in one call. */
  overview: (orgId: string): Promise<Overview> => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return apiFetch(`/agents/overview?org_id=${orgId}&tz=${encodeURIComponent(tz)}`)
  },

  // ── Tools ──
  listTools: (id: string): Promise<AgentTool[]> => apiFetch(`/agents/${id}/tools`),

  attachTool: (
    id: string,
    body: { connector_id: string; alias?: string; enabled_tools?: string[] | null; approval_tools?: string[] | null },
  ): Promise<AgentTool> =>
    apiFetch(`/agents/${id}/tools`, { method: "POST", body: JSON.stringify(body) }),

  detachTool: (id: string, connectorId: string): Promise<void> =>
    apiFetch(`/agents/${id}/tools/${connectorId}`, { method: "DELETE" }),

  // ── Agent calls ──
  listCalls: (id: string): Promise<AgentLink[]> =>
    apiFetch(`/agents/${id}/calls`),

  attachCall: (id: string, data: { target_agent_id: string; description: string }): Promise<AgentLink> =>
    apiFetch(`/agents/${id}/calls`, { method: "POST", body: JSON.stringify(data) }),

  detachCall: (id: string, linkId: string): Promise<void> =>
    apiFetch(`/agents/${id}/calls/${linkId}`, { method: "DELETE" }),

  // ── Triggers ──
  listTriggers: (id: string): Promise<Trigger[]> => apiFetch(`/agents/${id}/triggers`),

  createTrigger: (
    id: string,
    body: { type: TriggerType; config: Record<string, unknown>; enabled?: boolean },
  ): Promise<Trigger> =>
    apiFetch(`/agents/${id}/triggers`, { method: "POST", body: JSON.stringify(body) }),

  updateTrigger: (
    id: string,
    triggerId: string,
    body: { type: TriggerType; config: Record<string, unknown>; enabled: boolean },
  ): Promise<Trigger> =>
    apiFetch(`/agents/${id}/triggers/${triggerId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteTrigger: (id: string, triggerId: string): Promise<void> =>
    apiFetch(`/agents/${id}/triggers/${triggerId}`, { method: "DELETE" }),

  // ── Sessions ──
  listSessions: (id: string, limit = 50): Promise<Session[]> =>
    apiFetch(`/agents/${id}/sessions?limit=${limit}`),

  getSession: (id: string, sessionId: string): Promise<SessionDetail> =>
    apiFetch(`/agents/${id}/sessions/${sessionId}`),

  // ── Knowledge ──
  listKnowledge: (id: string): Promise<KnowledgeFile[]> =>
    apiFetch(`/agents/${id}/knowledge`),

  // Multipart, so apiFetch (which forces a JSON content type) is bypassed: the browser
  // must set the boundary header itself.
  uploadKnowledge: async (id: string, file: File): Promise<KnowledgeFile> => {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch(`${API_BASE}/agents/${id}/knowledge`, {
      method: "POST",
      credentials: "include",
      body: form,
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(error.detail ?? "Upload failed")
    }
    return res.json()
  },

  deleteKnowledge: (id: string, fileId: string): Promise<void> =>
    apiFetch(`/agents/${id}/knowledge/${fileId}`, { method: "DELETE" }),

  // Key-value memory. Keys go in the path verbatim (including `shared:`), URL-encoded.
  listMemory: (id: string): Promise<MemoryEntry[]> =>
    apiFetch(`/agents/${id}/memory`),
  putMemory: (id: string, key: string, value: unknown): Promise<MemoryEntry> =>
    apiFetch(`/agents/${id}/memory/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  deleteMemory: (id: string, key: string): Promise<void> =>
    apiFetch(`/agents/${id}/memory/${encodeURIComponent(key)}`, { method: "DELETE" }),
  clearMemory: (id: string): Promise<{ deleted: number }> =>
    apiFetch(`/agents/${id}/memory`, { method: "DELETE" }),

  addKnowledgeUrl: (id: string, url: string): Promise<KnowledgeFile> =>
    apiFetch(`/agents/${id}/knowledge/url`, { method: "POST", body: JSON.stringify({ url }) }),

  explainSession: (id: string, sessionId: string): Promise<{ session_id: string; summary: string }> =>
    apiFetch(`/agents/${id}/sessions/${sessionId}/explain`, { method: "POST" }),

  // ── Publish history ──
  publishHistory: (id: string): Promise<{
    id: string
    version: number
    published_at: string
    model: string
    instructions_preview: string
  }[]> => apiFetch(`/agents/${id}/publish-history`),

  rollback: (id: string, snapshotId: string): Promise<Agent> =>
    apiFetch(`/agents/${id}/rollback/${snapshotId}`, { method: "POST" }),

  // ── Assistant ──
  assistMessages: (id: string): Promise<{ id: string; role: string; content: string }[]> =>
    apiFetch(`/agents/${id}/assist/messages`),

  clearAssistThread: (id: string): Promise<void> =>
    apiFetch(`/agents/${id}/assist/messages`, { method: "DELETE" }),

  // ── Scenarios ──
  listScenarios: (id: string): Promise<Scenario[]> =>
    apiFetch(`/agents/${id}/scenarios`),

  createScenario: (
    id: string,
    body: { name: string; input_text: string; expected_tools?: string[] },
  ): Promise<Scenario> =>
    apiFetch(`/agents/${id}/scenarios`, { method: "POST", body: JSON.stringify(body) }),

  updateScenario: (
    id: string,
    scenarioId: string,
    body: { name: string; input_text: string; expected_tools?: string[] },
  ): Promise<Scenario> =>
    apiFetch(`/agents/${id}/scenarios/${scenarioId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteScenario: (id: string, scenarioId: string): Promise<void> =>
    apiFetch(`/agents/${id}/scenarios/${scenarioId}`, { method: "DELETE" }),

  runScenario: (id: string, scenarioId: string): Promise<{ scenario_id: string; session: Session }> =>
    apiFetch(`/agents/${id}/scenarios/${scenarioId}/run`, { method: "POST" }),
}

// ── Approvals ─────────────────────────────────────────────────────────────────

