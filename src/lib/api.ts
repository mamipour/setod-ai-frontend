const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

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

// ── Core fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send HttpOnly cookie automatically
    headers: { "Content-Type": "application/json" },
    ...init,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? "API error")
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T
  }

  return res.json() as Promise<T>
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

// ── Connectors ────────────────────────────────────────────────────────────────

export type ConnectorType = "gmail" | "telegram_bot" | "telegram_client" | "twilio" | "webhook" | "slack_webhook" | "google_sheets" | "whatsapp" | "openai" | "anthropic" | "mcp"
export type ConnectorStatus = "active" | "error" | "pending_auth" | "revoked"

export interface Connector {
  id: string
  name: string
  type: ConnectorType
  status: ConnectorStatus
  created_at: string
  updated_at: string
}

export const connectors = {
  list: (orgId: string): Promise<Connector[]> =>
    apiFetch(`/connectors/?org_id=${orgId}`),

  delete: (id: string, orgId: string): Promise<void> =>
    apiFetch(`/connectors/${id}?org_id=${orgId}`, { method: "DELETE" }),

  test: (id: string, orgId: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch(`/connectors/${id}/test?org_id=${orgId}`, { method: "POST" }),

  createGmail: (orgId: string, email: string, appPassword: string): Promise<Connector> =>
    apiFetch("/connectors/gmail", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, email, app_password: appPassword }),
    }),

  startTelegramClient: (orgId: string, phone: string): Promise<{ session_id: string }> =>
    apiFetch("/connectors/telegram-client/start", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, phone }),
    }),

  verifyTelegramClient: (
    sessionId: string,
    code?: string,
    password?: string,
  ): Promise<{ ok: boolean; needs_2fa?: boolean; user?: { name: string; phone: string; username: string } }> =>
    apiFetch("/connectors/telegram-client/verify", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, code, password }),
    }),

  saveTelegramClient: (sessionId: string, name: string, orgId: string): Promise<Connector> =>
    apiFetch("/connectors/telegram-client/save", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, name, org_id: orgId }),
    }),

  validateLLM: (provider: "openai" | "anthropic", apiKey: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch("/connectors/llm/validate", {
      method: "POST",
      body: JSON.stringify({ provider, api_key: apiKey }),
    }),

  createLLM: (orgId: string, name: string, provider: "openai" | "anthropic", apiKey: string): Promise<Connector> =>
    apiFetch("/connectors/llm", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, name, provider, api_key: apiKey }),
    }),

  // In-place key replacement — keeps the connector id, so agents bound to it stay bound.
  updateLLMKey: (connectorId: string, orgId: string, apiKey: string): Promise<Connector> =>
    apiFetch(`/connectors/llm/${connectorId}`, {
      method: "PATCH",
      body: JSON.stringify({ org_id: orgId, api_key: apiKey }),
    }),

  createTelegramBot: (
    orgId: string,
    name: string,
    botToken: string,
    adminChatId: number,
    adminUsername: string,
    adminFirstName: string,
  ): Promise<Connector> =>
    apiFetch("/connectors/telegram-bot", {
      method: "POST",
      body: JSON.stringify({
        org_id: orgId,
        name,
        bot_token: botToken,
        admin_chat_id: adminChatId,
        admin_username: adminUsername,
        admin_first_name: adminFirstName,
      }),
    }),

  validateTwilio: (
    accountSid: string,
    authToken: string,
    phoneNumber: string,
  ): Promise<{ ok: boolean; friendly_name: string; detail: string }> =>
    apiFetch("/connectors/twilio/validate", {
      method: "POST",
      body: JSON.stringify({ account_sid: accountSid, auth_token: authToken, phone_number: phoneNumber }),
    }),

  createTwilio: (
    orgId: string,
    accountSid: string,
    authToken: string,
    phoneNumber: string,
    name: string,
  ): Promise<Connector> =>
    apiFetch("/connectors/twilio", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, account_sid: accountSid, auth_token: authToken, phone_number: phoneNumber, name }),
    }),

  twilioSendTestSms: (connectorId: string, orgId: string, to: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch(`/connectors/twilio/${connectorId}/send-test-sms`, {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, to }),
    }),

  probeMcp: (orgId: string, url: string, token?: string): Promise<{
    url: string
    auth: "none" | "bearer" | "oauth"
    tools: { name: string; description: string }[] | null
    oauth: Record<string, unknown> | null
  }> =>
    apiFetch("/connectors/mcp/probe", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, url, token: token || null }),
    }),

  createMcp: (orgId: string, data: { name?: string; url: string; catalog_key: string; token?: string }): Promise<Connector> =>
    apiFetch("/connectors/mcp", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, ...data }),
    }),

  connectMcpOAuth: (orgId: string, catalogKey: string, url?: string, name?: string) => {
    const params = new URLSearchParams({ org_id: orgId, catalog_key: catalogKey })
    if (url) params.set("url", url)
    if (name) params.set("name", name)
    window.location.href = `${API_BASE}/connectors/oauth/mcp/start?${params}`
  },

  startMcpOAuth: (orgId: string, data: {
    catalog_key: string
    url?: string
    name?: string
    client_id?: string
    client_secret?: string
  }): Promise<{ redirect: string }> =>
    apiFetch("/connectors/oauth/mcp/start", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, ...data }),
    }),

  mcpCatalog: (): Promise<{
    key: string
    label: string
    url: string
    preferred_auth: string
    description: string
    oauth_ready: boolean
    needs_oauth_app: boolean
    redirect_uri: string
  }[]> => apiFetch("/connectors/mcp/catalog"),

  resyncMcp: (id: string, orgId: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch(`/connectors/${id}/mcp/resync?org_id=${orgId}`, { method: "POST" }),

  // ── Generic inbound webhook ────────────────────────────────────────────────
  createWebhook: (orgId: string, name?: string): Promise<{ connector: Connector; webhook_url: string; secret: string }> =>
    apiFetch("/connectors/webhook", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, name: name ?? "Inbound Webhook" }),
    }),

  regenWebhookSecret: (id: string, orgId: string): Promise<{ connector: Connector; webhook_url: string; secret: string }> =>
    apiFetch(`/connectors/${id}/regen-secret?org_id=${orgId}`, { method: "POST" }),

  // ── Slack outgoing webhook ─────────────────────────────────────────────────
  validateSlackWebhook: (orgId: string, webhookUrl: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch("/connectors/slack-webhook/validate", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, webhook_url: webhookUrl }),
    }),

  createSlackWebhook: (orgId: string, webhookUrl: string, name?: string): Promise<Connector> =>
    apiFetch("/connectors/slack-webhook", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, webhook_url: webhookUrl, name: name ?? "Slack" }),
    }),

  // ── Google Sheets ──────────────────────────────────────────────────────────
  validateSheets: (orgId: string, saJson: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch("/connectors/sheets/validate", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, sa_json: saJson }),
    }),

  createSheets: (orgId: string, saJson: string, name?: string, defaultSpreadsheetId?: string): Promise<Connector> =>
    apiFetch("/connectors/sheets", {
      method: "POST",
      body: JSON.stringify({
        org_id: orgId,
        sa_json: saJson,
        name: name ?? "",
        default_spreadsheet_id: defaultSpreadsheetId ?? "",
      }),
    }),

  // ── WhatsApp Business ──────────────────────────────────────────────────────
  validateWhatsApp: (phoneNumberId: string, accessToken: string): Promise<{ ok: boolean; detail: string }> =>
    apiFetch("/connectors/whatsapp/validate", {
      method: "POST",
      body: JSON.stringify({ org_id: "00000000-0000-0000-0000-000000000000", phone_number_id: phoneNumberId, access_token: accessToken, verify_token: "validate" }),
    }),

  createWhatsApp: (orgId: string, phoneNumberId: string, accessToken: string, verifyToken: string, name?: string): Promise<Connector> =>
    apiFetch("/connectors/whatsapp", {
      method: "POST",
      body: JSON.stringify({
        org_id: orgId,
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        verify_token: verifyToken,
        name: name ?? "",
      }),
    }),
}

// ── Agents ────────────────────────────────────────────────────────────────────

export type AgentStatus = "draft" | "published" | "paused"
export type TriggerType = "schedule" | "channel" | "manual" | "agent"
export type SessionStatus = "running" | "succeeded" | "error" | "waiting_approval"
export type MessageRole = "user" | "assistant" | "tool" | "system"

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
  runs_yesterday: number
  failures_yesterday: number
  tokens_yesterday: number
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

// ── Workspace integrations ─────────────────────────────────────────────────────

export interface WebSearchSettings {
  provider: "duckduckgo" | "tavily"
  tavily_key_set: boolean
}

export const workspace = {
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

// ── Token-based invitation flow ────────────────────────────────────────────────
export const tokenInvitations = {
  /** Accept an invitation by its token. User must be signed in. */
  accept: (token: string): Promise<{ ok: boolean; org_id: string }> =>
    apiFetch("/auth/invitations/accept", { method: "POST", body: JSON.stringify({ token }) }),

  /** Preview an invitation (name, inviter) without accepting — used by /accept-invite page. */
  preview: (token: string): Promise<{ org_name: string; role: string; invited_by: string; email: string }> =>
    apiFetch(`/auth/invitations/preview?token=${encodeURIComponent(token)}`),
}
