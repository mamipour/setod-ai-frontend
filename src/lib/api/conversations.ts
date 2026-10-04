import { API_BASE, apiFetch } from "./base"

export interface ConversationSummary {
  id: string
  channel: string
  peer_id: string
  peer_name: string
  thread_key: string
  status: "open" | "human" | "closed"
  last_inbound_at: string | null
  last_outbound_at: string | null
  created_at: string
}

export interface ConversationAttachment {
  kind: string
  provider_ref: string
  mime: string
  filename: string
  caption: string
  status: "pending" | "ready" | "failed" | "unavailable"
  text: string
  cost_usd: number
  stored_path: string
}

export interface ConversationMessageOut {
  id: string
  direction: "inbound" | "outbound"
  author: "peer" | "agent" | "human"
  kind: string
  text: string
  attachments: ConversationAttachment[]
  created_at: string
}

export interface ConversationThread {
  conversation: {
    id: string
    channel: string
    peer_id: string
    peer_name: string
    status: string
    summary: string
    created_at: string
  }
  messages: ConversationMessageOut[]
}

export const conversations = {
  list: (orgId: string, limit = 50, offset = 0): Promise<ConversationSummary[]> =>
    apiFetch(`/conversations?org_id=${orgId}&limit=${limit}&offset=${offset}`),

  get: (convId: string, limit = 100, offset = 0): Promise<ConversationThread> =>
    apiFetch(`/conversations/${convId}?limit=${limit}&offset=${offset}`),

  patch: (convId: string, status: string): Promise<{ id: string; status: string }> =>
    apiFetch(`/conversations/${convId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  sendManualReply: (convId: string, text: string): Promise<{ id: string | null; status: string }> =>
    apiFetch(`/conversations/${convId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  mediaUrl: (convId: string, messageId: string, idx: number): string =>
    `${API_BASE}/conversations/${convId}/media/${messageId}/${idx}`,
}

// ── Tables ─────────────────────────────────────────────────────────────────────
