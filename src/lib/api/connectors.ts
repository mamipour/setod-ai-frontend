import { API_BASE, apiFetch } from "./base"

export type ConnectorType = "gmail" | "telegram_bot" | "telegram_client" | "twilio" | "webhook" | "slack_webhook" | "google_sheets" | "whatsapp" | "instagram" | "hubspot" | "pipedrive" | "notion" | "airtable" | "shopify" | "google_business_profile" | "calendly" | "openai" | "anthropic" | "mcp" | "tables"
export type ConnectorStatus = "active" | "error" | "pending_auth" | "revoked"

export interface Connector {
  id: string
  name: string
  type: ConnectorType
  status: ConnectorStatus
  created_at: string
  updated_at: string
  phone_number?: string | null
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

  /** Update any connector's credentials in place — agents keep their link. */
  updateCredentials: (connectorId: string, orgId: string, credentials: Record<string, unknown>): Promise<Connector> =>
    apiFetch(`/connectors/${connectorId}/credentials`, {
      method: "PATCH",
      body: JSON.stringify({ org_id: orgId, ...credentials }),
    }),

  // ── Instagram ──────────────────────────────────────────────────────────────
  /** Redirect the browser to Instagram's OAuth consent screen.
   *  Pass connectorId to reconnect (refresh token) an existing connector. */
  startInstagramOAuth: (orgId: string, connectorId?: string) => {
    const url = new URL(`${API_BASE}/connectors/oauth/instagram/start`)
    url.searchParams.set("org_id", orgId)
    if (connectorId) url.searchParams.set("connector_id", connectorId)
    window.location.href = url.toString()
  },

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

  createHubSpot: (orgId: string, apiToken: string, name?: string): Promise<Connector> =>
    apiFetch("/connectors/hubspot", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, api_token: apiToken, name: name ?? "" }),
    }),

  createPipedrive: (orgId: string, apiToken: string, name?: string): Promise<Connector> =>
    apiFetch("/connectors/pipedrive", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, api_token: apiToken, name: name ?? "" }),
    }),

  createNotion: (orgId: string, apiToken: string, name?: string): Promise<Connector> =>
    apiFetch("/connectors/notion", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, api_token: apiToken, name: name ?? "" }),
    }),

  createAirtable: (orgId: string, apiToken: string, name?: string): Promise<Connector> =>
    apiFetch("/connectors/airtable", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, api_token: apiToken, name: name ?? "" }),
    }),

  createShopify: (orgId: string, shopDomain: string, accessToken: string, name?: string): Promise<Connector> =>
    apiFetch("/connectors/shopify", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, shop_domain: shopDomain, access_token: accessToken, name: name ?? "" }),
    }),

  gbpOAuthStartUrl: (orgId: string, connectorId?: string): string => {
    const url = new URL(`${API_BASE}/connectors/oauth/gbp/start`)
    url.searchParams.set("org_id", orgId)
    if (connectorId) url.searchParams.set("connector_id", connectorId)
    return url.toString()
  },

  createCalendly: (orgId: string, apiToken: string, name?: string): Promise<Connector> =>
    apiFetch("/connectors/calendly", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, api_token: apiToken, name: name ?? "" }),
    }),
}

// ── Agents ────────────────────────────────────────────────────────────────────

