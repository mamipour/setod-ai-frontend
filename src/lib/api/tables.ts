import { API_BASE, apiFetch } from "./base"

export type ColumnType =
  | "text" | "long_text" | "number" | "checkbox" | "date" | "datetime"
  | "email" | "phone" | "url" | "select" | "link"

export interface ColumnDef {
  key: string
  name: string
  type: ColumnType
  required?: boolean
  options?: string[]          // for select
  hidden_from_agents?: boolean
  description?: string
}

export interface OrgTable {
  id: string
  org_id: string
  name: string
  slug: string
  description?: string
  columns: ColumnDef[]
  unique_on?: string[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface OrgTableRow {
  id: string
  org_id: string
  table_id: string
  data: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
  deleted_at?: string
  created_by_user_id?: string
  created_by_session_id?: string
}

export interface OrgTableEvent {
  id: string
  action: "create" | "update" | "delete" | "restore" | "schema"
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  actor_user_id?: string
  agent_id?: string
  created_at: string
}

export interface ImportPreview {
  inferred_columns: ColumnDef[]
  sample_rows: Record<string, unknown>[]
  total_rows: number
  errors: string[]
}

export interface TablePreset {
  name: string
  description: string
  columns: ColumnDef[]
  unique_on: string[]
}

/** One agent's access to a table, as reported by GET /tables/{id}/agents. */
export interface TableAgentAccess {
  id: string
  name: string
  read: boolean
  write: boolean
}

export const tablesApi = {
  // Table CRUD
  list: (orgId: string): Promise<OrgTable[]> => apiFetch(`/tables?org_id=${orgId}`),

  create: (orgId: string, body: {
    name: string
    /** Explicit English identifier; only needed when the name has no Latin letters. */
    slug?: string
    description?: string
    columns?: ColumnDef[]
    unique_on?: string[]
  }): Promise<OrgTable> =>
    apiFetch(`/tables?org_id=${orgId}`, { method: "POST", body: JSON.stringify({ org_id: orgId, ...body }) }),

  get: (orgId: string, tableId: string): Promise<OrgTable> => apiFetch(`/tables/${tableId}?org_id=${orgId}`),

  updateMeta: (orgId: string, tableId: string, body: {
    name?: string
    description?: string
    unique_on?: string[]
  }): Promise<OrgTable> =>
    apiFetch(`/tables/${tableId}?org_id=${orgId}`, { method: "PATCH", body: JSON.stringify(body) }),

  /** Agents that can read and/or write this table. Shown before deleting. */
  agentsUsing: (orgId: string, tableId: string): Promise<TableAgentAccess[]> =>
    apiFetch(`/tables/${tableId}/agents?org_id=${orgId}`),

  /** Owner only. 409 if agents use the table and `force` is false; with force their access is removed. */
  delete: (orgId: string, tableId: string, force = false): Promise<void> =>
    apiFetch(`/tables/${tableId}?org_id=${orgId}${force ? "&force=true" : ""}`, { method: "DELETE" }),

  // Column operations
  addColumn: (orgId: string, tableId: string, col: ColumnDef): Promise<OrgTable> =>
    apiFetch(`/tables/${tableId}/columns?org_id=${orgId}`, { method: "POST", body: JSON.stringify(col) }),

  updateColumn: (orgId: string, tableId: string, key: string, body: Partial<ColumnDef>): Promise<OrgTable> =>
    apiFetch(`/tables/${tableId}/columns/${key}?org_id=${orgId}`, { method: "PATCH", body: JSON.stringify(body) }),

  removeColumn: (orgId: string, tableId: string, key: string): Promise<OrgTable> =>
    apiFetch(`/tables/${tableId}/columns/${key}?org_id=${orgId}`, { method: "DELETE" }),

  // Row CRUD
  listRows: (
    orgId: string,
    tableId: string,
    params?: {
      search?: string
      order_by?: string
      desc?: boolean
      offset?: number
      limit?: number
      include_deleted?: boolean
    }
  ): Promise<{ rows: OrgTableRow[]; total: number }> => {
    const q = new URLSearchParams({ org_id: orgId })
    if (params?.search) q.set("search", params.search)
    if (params?.order_by) q.set("order_by", params.order_by)
    if (params?.desc !== undefined) q.set("desc", String(params.desc))
    if (params?.offset !== undefined) q.set("offset", String(params.offset))
    if (params?.limit !== undefined) q.set("limit", String(params.limit))
    if (params?.include_deleted) q.set("include_deleted", "true")
    return apiFetch(`/tables/${tableId}/rows?${q.toString()}`)
  },

  createRow: (orgId: string, tableId: string, data: Record<string, unknown>): Promise<OrgTableRow> =>
    apiFetch(`/tables/${tableId}/rows?org_id=${orgId}`, { method: "POST", body: JSON.stringify({ data }) }),

  getRow: (orgId: string, tableId: string, rowId: string): Promise<OrgTableRow> =>
    apiFetch(`/tables/${tableId}/rows/${rowId}?org_id=${orgId}`),

  updateRow: (orgId: string, tableId: string, rowId: string, body: {
    data: Record<string, unknown>
    expected_version?: number
  }): Promise<OrgTableRow> =>
    apiFetch(`/tables/${tableId}/rows/${rowId}?org_id=${orgId}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteRow: (orgId: string, tableId: string, rowId: string): Promise<{ ok: boolean }> =>
    apiFetch(`/tables/${tableId}/rows/${rowId}?org_id=${orgId}`, { method: "DELETE" }),

  restoreRow: (orgId: string, tableId: string, rowId: string): Promise<OrgTableRow> =>
    apiFetch(`/tables/${tableId}/rows/${rowId}/restore?org_id=${orgId}`, { method: "POST" }),

  rowHistory: (orgId: string, tableId: string, rowId: string): Promise<OrgTableEvent[]> =>
    apiFetch(`/tables/${tableId}/rows/${rowId}/history?org_id=${orgId}`),

  // Export / import
  exportUrl: (orgId: string, tableId: string): string =>
    `${API_BASE}/tables/${tableId}/export?org_id=${orgId}`,

  importPreview: (orgId: string, tableId: string, file: File): Promise<ImportPreview> => {
    const form = new FormData()
    form.append("file", file)
    return apiFetch(`/tables/${tableId}/import/preview?org_id=${orgId}`, { method: "POST", body: form })
  },

  importCommit: (orgId: string, tableId: string, rows: Record<string, unknown>[]): Promise<{ imported: number; skipped: number }> =>
    apiFetch(`/tables/${tableId}/import/commit?org_id=${orgId}`, { method: "POST", body: JSON.stringify({ rows }) }),

  // Presets
  listPresets: (orgId: string): Promise<Record<string, TablePreset>> => apiFetch(`/tables/presets?org_id=${orgId}`),
  getPreset: (orgId: string, key: string): Promise<TablePreset> => apiFetch(`/tables/presets/${key}?org_id=${orgId}`),
}

// ── Billing ───────────────────────────────────────────────────────────────────

