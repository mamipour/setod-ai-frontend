"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Upload,
  History,
  X,
  Check,
  AlertCircle,
} from "lucide-react"
import {
  tablesApi,
  type OrgTable,
  type OrgTableRow,
  type OrgTableEvent,
  type ColumnDef,
  type ColumnType,
} from "@/lib/api"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ── Column type options ────────────────────────────────────────────────────────
const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: "text",      label: "Text" },
  { value: "long_text", label: "Long text" },
  { value: "number",    label: "Number" },
  { value: "checkbox",  label: "Checkbox" },
  { value: "date",      label: "Date" },
  { value: "datetime",  label: "Date & time" },
  { value: "email",     label: "Email" },
  { value: "phone",     label: "Phone" },
  { value: "url",       label: "URL" },
  { value: "select",    label: "Select" },
  { value: "link",      label: "Link" },
]

// ── Add column dialog ─────────────────────────────────────────────────────────
function AddColumnDialog({
  open,
  onClose,
  onAdded,
  orgId,
  tableId,
}: {
  open: boolean
  onClose: () => void
  onAdded: (t: OrgTable) => void
  orgId: string
  tableId: string
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState<ColumnType>("text")
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handle() {
    if (!name.trim()) { setError("Name is required."); return }
    setSaving(true); setError("")
    try {
      const col: ColumnDef = {
        key: name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        name: name.trim(),
        type,
        required,
        options: type === "select" ? options.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      }
      const t = await tablesApi.addColumn(orgId, tableId, col)
      onAdded(t)
      setName(""); setType("text"); setRequired(false); setOptions("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add column.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add column</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Status" className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ColumnType)}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value} className="text-xs">{ct.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "select" && (
            <div className="space-y-1">
              <Label className="text-xs">Options (comma-separated)</Label>
              <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="New, In Progress, Done" className="text-xs" />
            </div>
          )}
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handle} disabled={saving} className="text-xs">
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Add column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Row history panel ─────────────────────────────────────────────────────────
function RowHistoryPanel({
  orgId,
  tableId,
  rowId,
  onClose,
}: {
  orgId: string
  tableId: string
  rowId: string
  onClose: () => void
}) {
  const [events, setEvents] = useState<OrgTableEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tablesApi.rowHistory(orgId, tableId, rowId).then(setEvents).finally(() => setLoading(false))
  }, [orgId, tableId, rowId])

  const ACTION_LABELS: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    restore: "Restored",
    schema: "Schema changed",
  }

  return (
    <div className="flex flex-col gap-3 min-w-[280px] max-w-xs border-l bg-background p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Row history</h3>
        <button onClick={onClose} className="rounded p-0.5 hover:bg-accent"><X className="size-3.5" /></button>
      </div>
      {loading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">No history.</p>
      ) : (
        <div className="space-y-3 overflow-y-auto">
          {events.map((ev) => (
            <div key={ev.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{ACTION_LABELS[ev.action] ?? ev.action}</span>
                <span className="text-[11px] text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
              </div>
              {ev.after && (
                <pre className="rounded bg-muted px-2 py-1.5 text-[10px] overflow-x-auto">
                  {JSON.stringify(ev.after, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Import dialog ─────────────────────────────────────────────────────────────
function ImportDialog({
  open,
  onClose,
  orgId,
  tableId,
  onDone,
}: {
  open: boolean
  onClose: () => void
  orgId: string
  tableId: string
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ total_rows: number; errors: string[] } | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState("")

  async function handlePreview() {
    if (!file) return
    setPreviewing(true); setError("")
    try {
      const p = await tablesApi.importPreview(orgId, tableId, file)
      setPreview({ total_rows: p.total_rows, errors: p.errors })
      setRows(p.sample_rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Preview failed.")
    } finally {
      setPreviewing(false)
    }
  }

  async function handleImport() {
    setImporting(true); setError("")
    try {
      const result = await tablesApi.importCommit(orgId, tableId, rows)
      setDone(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed.")
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    if (done) onDone()
    setFile(null); setPreview(null); setRows([]); setDone(null); setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Import data</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          {!done ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs">File (CSV or XLSX)</Label>
                <Input
                  type="file"
                  accept=".csv,.xlsx"
                  className="text-xs"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null) }}
                />
              </div>
              {preview && (
                <div className="rounded-lg bg-muted px-3 py-2 text-xs space-y-1">
                  <p className="font-medium">{preview.total_rows} rows ready to import</p>
                  {preview.errors.length > 0 && (
                    <ul className="text-amber-600 space-y-0.5">
                      {preview.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                      {preview.errors.length > 5 && <li>…and {preview.errors.length - 5} more</li>}
                    </ul>
                  )}
                </div>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <Check className="size-8 text-green-500" />
              <p className="text-sm font-medium">Import complete</p>
              <p className="text-xs text-muted-foreground">{done.imported} rows imported, {done.skipped} skipped (duplicates).</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && !preview && (
            <Button size="sm" onClick={handlePreview} disabled={!file || previewing} className="text-xs">
              {previewing && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Preview
            </Button>
          )}
          {!done && preview && (
            <Button size="sm" onClick={handleImport} disabled={importing || preview.total_rows === 0} className="text-xs">
              {importing && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Import {preview.total_rows} rows
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Inline row editor (simple form-based fallback) ────────────────────────────
function RowEditorPanel({
  orgId,
  table,
  row,
  onClose,
  onSaved,
  onDeleted,
}: {
  orgId: string
  table: OrgTable
  row: OrgTableRow | null   // null = new row
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [data, setData] = useState<Record<string, unknown>>(() => row?.data ?? {})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState("")

  const visibleCols = table.columns.filter((c) => !c.hidden_from_agents)

  async function handleSave() {
    setSaving(true); setError("")
    try {
      if (row) {
        await tablesApi.updateRow(orgId, table.id, row.id, { data, expected_version: row.version })
      } else {
        await tablesApi.createRow(orgId, table.id, data)
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!row) return
    setDeleting(true)
    try {
      await tablesApi.deleteRow(orgId, table.id, row.id)
      onDeleted()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col min-w-[300px] max-w-sm border-l bg-background p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{row ? "Edit row" : "New row"}</h3>
        <div className="flex items-center gap-1">
          {row && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              title="Row history"
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <History className="size-3.5" />
            </button>
          )}
          <button onClick={onClose} className="rounded p-0.5 hover:bg-accent">
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {showHistory && row ? (
        <RowHistoryPanel orgId={orgId} tableId={table.id} rowId={row.id} onClose={() => setShowHistory(false)} />
      ) : (
        <div className="space-y-3 flex-1">
          {visibleCols.map((col) => (
            <div key={col.key} className="space-y-1">
              <Label className="text-xs">
                {col.name}
                {col.required && <span className="ml-1 text-destructive">*</span>}
              </Label>
              {col.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={!!data[col.key]}
                  onChange={(e) => setData((d) => ({ ...d, [col.key]: e.target.checked }))}
                  className="h-4 w-4"
                />
              ) : col.type === "select" ? (
                <Select
                  value={String(data[col.key] ?? "")}
                  onValueChange={(v) => setData((d) => ({ ...d, [col.key]: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(col.options ?? []).map((o) => (
                      <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : col.type === "long_text" ? (
                <textarea
                  value={String(data[col.key] ?? "")}
                  onChange={(e) => setData((d) => ({ ...d, [col.key]: e.target.value }))}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-xs resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
                />
              ) : (
                <Input
                  type={col.type === "number" ? "number" : col.type === "date" ? "date" : col.type === "datetime" ? "datetime-local" : "text"}
                  value={String(data[col.key] ?? "")}
                  onChange={(e) => setData((d) => ({ ...d, [col.key]: e.target.value }))}
                  className="h-8 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700 mt-3">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t gap-2">
        {row ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main grid component ────────────────────────────────────────────────────────
function TableGrid({
  table,
  rows,
  onRowClick,
}: {
  table: OrgTable
  rows: OrgTableRow[]
  onRowClick: (row: OrgTableRow) => void
}) {
  // We use a simple HTML table instead of the full Glide grid for server-side
  // compatibility and reliability. The Glide grid is available via the DataEditor
  // import but requires canvas context. We render a standard table that looks like
  // a spreadsheet with sticky headers and alternating rows.
  const visibleCols = table.columns.filter((c) => !c.hidden_from_agents)

  function formatCell(col: ColumnDef, val: unknown): string {
    if (val === null || val === undefined || val === "") return ""
    if (col.type === "checkbox") return val ? "✓" : ""
    if (col.type === "datetime" && typeof val === "string") {
      try { return new Date(val).toLocaleString() } catch { return String(val) }
    }
    if (col.type === "date" && typeof val === "string") {
      try { return new Date(val).toLocaleDateString() } catch { return String(val) }
    }
    return String(val)
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">No rows yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Click "+ Add row" to add the first entry.</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead>
          <tr>
            {visibleCols.map((col) => (
              <th
                key={col.key}
                className="sticky top-0 z-10 border-b border-r bg-muted px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row)}
              className="cursor-pointer hover:bg-accent/40 transition-colors"
            >
              {visibleCols.map((col) => (
                <td
                  key={col.key}
                  className="border-b border-r px-3 py-2 max-w-[240px] truncate"
                  title={String(row.data[col.key] ?? "")}
                >
                  {formatCell(col, row.data[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 100

export default function TableDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""

  const [table, setTable] = useState<OrgTable | null>(null)
  const [rows, setRows] = useState<OrgTableRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [error, setError] = useState("")

  // Panels
  const [addingColumn, setAddingColumn] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedRow, setSelectedRow] = useState<OrgTableRow | null | "new">(null)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadRows(tbl: OrgTable, q: string, off: number) {
    setRowsLoading(true)
    try {
      const result = await tablesApi.listRows(orgId, tbl.id, { search: q || undefined, offset: off, limit: PAGE_SIZE })
      setRows(result.rows)
      setTotal(result.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load rows.")
    } finally {
      setRowsLoading(false)
    }
  }

  useEffect(() => {
    if (!orgId) return
    async function init() {
      setLoading(true)
      try {
        const t = await tablesApi.get(orgId, id)
        setTable(t)
        await loadRows(t, "", 0)
      } catch {
        setError("Table not found.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, orgId])

  function handleSearchChange(q: string) {
    setSearch(q)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (table && orgId) { setOffset(0); loadRows(table, q, 0) }
    }, 350)
  }

  function handleRowSaved() {
    setSelectedRow(null)
    if (table && orgId) loadRows(table, search, offset)
  }

  function handleRowDeleted() {
    setSelectedRow(null)
    if (table && orgId) loadRows(table, search, offset)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!table || error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-xs">
          <ArrowLeft className="size-3.5" /> Back
        </Button>
        <p className="text-sm text-red-600">{error || "Table not found."}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/tables")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{table.name}</h1>
            {table.description && (
              <p className="text-xs text-muted-foreground truncate">{table.description}</p>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search…"
            className="h-8 w-40 text-xs"
          />

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setSelectedRow("new")}
          >
            <Plus className="size-3.5" /> Add row
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-xs hover:bg-accent transition-colors">
              <Settings2 className="size-3.5" />
              <ChevronDown className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => setAddingColumn(true)}>
                <Plus className="size-3.5 mr-2" /> Add column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setImporting(true)}>
                <Upload className="size-3.5 mr-2" /> Import CSV / XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const a = document.createElement("a")
                a.href = tablesApi.exportUrl(orgId, table.id)
                a.download = `${table.slug}.csv`
                a.click()
              }}>
                <Download className="size-3.5 mr-2" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { if (table && orgId) loadRows(table, search, offset) }}
              >
                <RefreshCw className="size-3.5 mr-2" /> Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row count */}
      <div className="text-xs text-muted-foreground">
        {total.toLocaleString()} row{total !== 1 ? "s" : ""}
        {rowsLoading && <Loader2 className="ml-2 inline size-3 animate-spin" />}
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden rounded-xl border bg-card">
        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <TableGrid
            table={table}
            rows={rows}
            onRowClick={(row) => setSelectedRow(row)}
          />
        </div>

        {/* Side panel */}
        {selectedRow !== null && (
          <RowEditorPanel
            orgId={orgId}
            table={table}
            row={selectedRow === "new" ? null : selectedRow}
            onClose={() => setSelectedRow(null)}
            onSaved={handleRowSaved}
            onDeleted={handleRowDeleted}
          />
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={offset === 0}
              onClick={() => { const o = Math.max(0, offset - PAGE_SIZE); setOffset(o); loadRows(table, search, o) }}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => { const o = offset + PAGE_SIZE; setOffset(o); loadRows(table, search, o) }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddColumnDialog
        open={addingColumn}
        onClose={() => setAddingColumn(false)}
        onAdded={(t) => { setTable(t); setAddingColumn(false) }}
        orgId={orgId}
        tableId={table.id}
      />

      <ImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        orgId={orgId}
        tableId={table.id}
        onDone={() => { setImporting(false); if (table) loadRows(table, search, offset) }}
      />
    </div>
  )
}
