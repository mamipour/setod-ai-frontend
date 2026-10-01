"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronDown,
  Download,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Upload,
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

// ── Custom inline select (avoids OS-native white popup in dark mode) ──────────
function InlineCellSelect({
  options,
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCommit()
      }
    }
    document.addEventListener("mousedown", handleDown)
    return () => document.removeEventListener("mousedown", handleDown)
  }, [onCommit])

  // Keyboard: Escape cancels
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onCancel() }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onCancel])

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Current value display */}
      <div className="flex items-center justify-between gap-1 text-xs">
        <span className={value ? "" : "text-muted-foreground/40"}>
          {value || "—"}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
      </div>
      {/* Dropdown popup */}
      <div className="absolute top-full left-0 z-[200] mt-0.5 min-w-[140px] max-h-52 overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-xl py-1">
        <button
          className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          onMouseDown={(e) => { e.preventDefault(); onChange(""); onCommit() }}
        >
          —
        </button>
        {options.map((o) => (
          <button
            key={o}
            className={cn(
              "w-full text-left px-3 py-1.5 text-xs hover:bg-accent",
              value === o && "bg-accent font-medium",
            )}
            onMouseDown={(e) => { e.preventDefault(); onChange(o); onCommit() }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Inline cell editor ─────────────────────────────────────────────────────────
function CellEditor({
  col,
  value,
  onChange,
  onCommit,
  onCancel,
  onTab,
}: {
  col: ColumnDef
  value: unknown
  onChange: (v: unknown) => void
  onCommit: () => void
  onCancel: () => void
  onTab: (shift: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (inputRef.current && typeof inputRef.current.select === "function") {
      inputRef.current.select()
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onCommit() }
    if (e.key === "Escape") { e.preventDefault(); onCancel() }
    if (e.key === "Tab") { e.preventDefault(); onTab(e.shiftKey) }
  }

  const str = value == null ? "" : String(value)

  if (col.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => { onChange(e.target.checked); onCommit() }}
        className="h-4 w-4 cursor-pointer"
        autoFocus
      />
    )
  }

  if (col.type === "select") {
    return (
      <InlineCellSelect
        options={col.options ?? []}
        value={str}
        onChange={onChange}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    )
  }

  if (col.type === "long_text") {
    return (
      <textarea
        ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
        value={str}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancel() }
          if (e.key === "Tab") { e.preventDefault(); onTab(e.shiftKey) }
        }}
        onBlur={onCommit}
        rows={3}
        className="w-full min-w-[200px] resize-none bg-transparent text-xs outline-none"
        autoFocus
      />
    )
  }

  return (
    <input
      ref={inputRef}
      type={
        col.type === "number" ? "number" :
        col.type === "date" ? "date" :
        col.type === "datetime" ? "datetime-local" :
        col.type === "email" ? "email" :
        "text"
      }
      value={str}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
      className="w-full min-w-[80px] bg-transparent text-xs outline-none"
    />
  )
}

// ── Cell display ───────────────────────────────────────────────────────────────
function CellDisplay({ col, value }: { col: ColumnDef; value: unknown }) {
  if (value == null || value === "") return <span className="text-muted-foreground/30">—</span>

  if (col.type === "checkbox") return value ? <Check className="size-3.5 text-green-500" /> : null

  if (col.type === "select") {
    return (
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
        {String(value)}
      </span>
    )
  }

  if (col.type === "url") {
    return (
      <a
        href={String(value)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-blue-500 underline underline-offset-2 hover:text-blue-400 truncate block max-w-[180px]"
      >
        {String(value)}
      </a>
    )
  }

  if (col.type === "datetime" && typeof value === "string") {
    try { return <span>{new Date(value).toLocaleString()}</span> } catch { /* fall through */ }
  }
  if (col.type === "date" && typeof value === "string") {
    try { return <span>{new Date(value).toLocaleDateString()}</span> } catch { /* fall through */ }
  }

  return <span className="truncate block max-w-[200px]">{String(value)}</span>
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

  return (
    <div className="flex flex-col gap-3 w-72 border-l bg-background p-4 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Row history</h3>
        <button onClick={onClose} className="rounded p-0.5 hover:bg-accent"><X className="size-3.5" /></button>
      </div>
      {loading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">No history.</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium capitalize">{ev.action}</span>
                <span className="text-[11px] text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
              </div>
              {ev.after && (
                <pre className="rounded bg-muted px-2 py-1.5 text-[10px] overflow-x-auto max-h-32">
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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Status" className="text-xs" autoFocus />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ColumnType)}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
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
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}Add column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                <Input type="file" accept=".csv,.xlsx" className="text-xs"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null) }} />
              </div>
              {preview && (
                <div className="rounded-lg bg-muted px-3 py-2 text-xs space-y-1">
                  <p className="font-medium">{preview.total_rows} rows ready to import</p>
                  {preview.errors.slice(0, 5).map((e, i) => <p key={i} className="text-amber-600">{e}</p>)}
                </div>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <Check className="size-8 text-green-500" />
              <p className="text-sm font-medium">Import complete</p>
              <p className="text-xs text-muted-foreground">{done.imported} rows imported, {done.skipped} skipped.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">{done ? "Close" : "Cancel"}</Button>
          {!done && !preview && (
            <Button size="sm" onClick={handlePreview} disabled={!file || previewing} className="text-xs">
              {previewing && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}Preview
            </Button>
          )}
          {!done && preview && (
            <Button size="sm" onClick={handleImport} disabled={importing || preview.total_rows === 0} className="text-xs">
              {importing && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}Import {preview.total_rows} rows
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface EditingCell { rowIdx: number; colKey: string }
// A "draft row" is an unsaved new row being typed at the bottom
interface DraftRow { data: Record<string, unknown> }

// ── Spreadsheet grid ───────────────────────────────────────────────────────────
function SpreadsheetGrid({
  orgId,
  table,
  rows,
  onRowsChanged,
}: {
  orgId: string
  table: OrgTable
  rows: OrgTableRow[]
  onRowsChanged: () => void
}) {
  const visibleCols = table.columns.filter((c) => !c.hidden_from_agents)

  // ── Top scrollbar sync ────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const syncingRef = useRef(false)

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const update = () => setContentWidth(el.scrollWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }) // run after every render so width stays accurate

  function onMainScroll(e: React.UIEvent<HTMLDivElement>) {
    if (syncingRef.current) return
    syncingRef.current = true
    if (topBarRef.current) topBarRef.current.scrollLeft = e.currentTarget.scrollLeft
    syncingRef.current = false
  }

  function onTopScroll(e: React.UIEvent<HTMLDivElement>) {
    if (syncingRef.current) return
    syncingRef.current = true
    if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = e.currentTarget.scrollLeft
    syncingRef.current = false
  }

  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState<unknown>(null)
  const [saving, setSaving] = useState<string | null>(null) // rowId being saved
  const [historyRowId, setHistoryRowId] = useState<string | null>(null)
  // Cell-level validation errors: key = `${rowId}:${colKey}`
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({})
  // Draft new rows (pending creation)
  const [draftRows, setDraftRows] = useState<DraftRow[]>([])
  const [draftEditing, setDraftEditing] = useState<{ draftIdx: number; colKey: string } | null>(null)
  const [draftValue, setDraftValue] = useState<unknown>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({}) // rowId → error (delete/draft ops only)

  const totalRows = rows.length + draftRows.length

  // ── Cell click ────────────────────────────────────────────────────────────────
  function startEdit(rowIdx: number, colKey: string) {
    const row = rows[rowIdx]
    setEditing({ rowIdx, colKey })
    setEditValue(row.data[colKey] ?? null)
    setDraftEditing(null)
  }

  function startDraftEdit(draftIdx: number, colKey: string) {
    setDraftEditing({ draftIdx, colKey })
    setDraftValue(draftRows[draftIdx]?.data[colKey] ?? null)
    setEditing(null)
  }

  // ── Commit existing row cell ─────────────────────────────────────────────────
  async function commitEdit() {
    if (!editing) return
    const row = rows[editing.rowIdx]
    const col = visibleCols.find((c) => c.key === editing.colKey)
    if (!row || !col) { setEditing(null); return }

    // No change?
    const prev = row.data[editing.colKey]
    const cur = editValue
    if (String(prev ?? "") === String(cur ?? "")) { setEditing(null); return }

    setSaving(row.id)
    try {
      await tablesApi.updateRow(orgId, table.id, row.id, {
        data: { [editing.colKey]: cur === "" ? null : cur },
        expected_version: row.version,
      })
      onRowsChanged()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed"
      const key = `${row.id}:${editing.colKey}`
      setCellErrors((prev) => ({ ...prev, [key]: msg }))
      setTimeout(() => setCellErrors((p) => { const n = { ...p }; delete n[key]; return n }), 4000)
    } finally {
      setSaving(null)
    }
    setEditing(null)
  }

  function cancelEdit() { setEditing(null); setEditValue(null) }

  // ── Commit draft row cell ─────────────────────────────────────────────────────
  function commitDraftCell() {
    if (!draftEditing) return
    setDraftRows((prev) => {
      const copy = [...prev]
      copy[draftEditing.draftIdx] = {
        data: { ...copy[draftEditing.draftIdx].data, [draftEditing.colKey]: draftValue === "" ? null : draftValue },
      }
      return copy
    })
    setDraftEditing(null); setDraftValue(null)
  }

  // ── Save a draft row ─────────────────────────────────────────────────────────
  async function saveDraftRow(draftIdx: number) {
    const draft = draftRows[draftIdx]
    if (!draft) return
    // Check if anything was entered
    const hasData = Object.values(draft.data).some((v) => v != null && v !== "")
    if (!hasData) {
      setDraftRows((prev) => prev.filter((_, i) => i !== draftIdx))
      return
    }
    setSavingDraft(true)
    try {
      await tablesApi.createRow(orgId, table.id, draft.data)
      setDraftRows((prev) => prev.filter((_, i) => i !== draftIdx))
      onRowsChanged()
    } catch (e: unknown) {
      setErrors((prev) => ({ ...prev, [`draft_${draftIdx}`]: e instanceof Error ? e.message : "Save failed" }))
    } finally {
      setSavingDraft(false)
    }
  }

  // ── Delete row ────────────────────────────────────────────────────────────────
  async function deleteRow(rowId: string) {
    try {
      await tablesApi.deleteRow(orgId, table.id, rowId)
      onRowsChanged()
    } catch (e: unknown) {
      setErrors((prev) => ({ ...prev, [rowId]: e instanceof Error ? e.message : "Delete failed" }))
    }
  }

  // ── Tab navigation ────────────────────────────────────────────────────────────
  function tabFromExisting(shift: boolean) {
    if (!editing) return
    commitEdit()
    const colIdx = visibleCols.findIndex((c) => c.key === editing.colKey)
    const rowIdx = editing.rowIdx
    if (!shift) {
      // Next col
      if (colIdx < visibleCols.length - 1) {
        setTimeout(() => startEdit(rowIdx, visibleCols[colIdx + 1].key), 10)
      } else if (rowIdx < rows.length - 1) {
        setTimeout(() => startEdit(rowIdx + 1, visibleCols[0].key), 10)
      } else {
        // Move to first draft or add new draft
        if (draftRows.length > 0) {
          setTimeout(() => startDraftEdit(0, visibleCols[0].key), 10)
        } else {
          addDraftRow()
          setTimeout(() => startDraftEdit(0, visibleCols[0].key), 50)
        }
      }
    } else {
      if (colIdx > 0) {
        setTimeout(() => startEdit(rowIdx, visibleCols[colIdx - 1].key), 10)
      } else if (rowIdx > 0) {
        setTimeout(() => startEdit(rowIdx - 1, visibleCols[visibleCols.length - 1].key), 10)
      }
    }
  }

  function tabFromDraft(shift: boolean) {
    if (!draftEditing) return
    commitDraftCell()
    const colIdx = visibleCols.findIndex((c) => c.key === draftEditing.colKey)
    const draftIdx = draftEditing.draftIdx
    if (!shift) {
      if (colIdx < visibleCols.length - 1) {
        setTimeout(() => startDraftEdit(draftIdx, visibleCols[colIdx + 1].key), 10)
      } else {
        // Save this draft, move to next
        saveDraftRow(draftIdx).then(() => {
          addDraftRow()
          setTimeout(() => startDraftEdit(0, visibleCols[0].key), 50)
        })
      }
    } else {
      if (colIdx > 0) {
        setTimeout(() => startDraftEdit(draftIdx, visibleCols[colIdx - 1].key), 10)
      } else if (rows.length > 0) {
        setTimeout(() => startEdit(rows.length - 1, visibleCols[visibleCols.length - 1].key), 10)
      }
    }
  }

  function addDraftRow() {
    setDraftRows((prev) => [...prev, { data: {} }])
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const COL_W = "min-w-[140px] max-w-[240px]"
  const CELL_BASE = "border-b border-r px-3 py-1.5 text-xs align-middle h-9"

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left column: top-scrollbar + grid */}
      <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Top horizontal scrollbar (mirrors the grid's horizontal scroll) ── */}
      <div
        ref={topBarRef}
        onScroll={onTopScroll}
        className="overflow-x-scroll overflow-y-hidden shrink-0 border-b"
        style={{ height: 20 }}
      >
        <div style={{ width: contentWidth || "100%", height: 1 }} />
      </div>

      {/* Grid scroll area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto" onScroll={onMainScroll}>
        <table ref={tableRef} className="min-w-full text-xs border-separate border-spacing-0 select-none">
          {/* Column headers */}
          <thead>
            <tr>
              {/* Row # */}
              <th className="sticky top-0 z-20 w-10 border-b border-r bg-muted/80 backdrop-blur-sm" />
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "sticky top-0 z-20 border-b border-r bg-muted/80 backdrop-blur-sm",
                    "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                    COL_W,
                  )}
                >
                  {col.name}
                  {col.required && <span className="ml-1 text-destructive">*</span>}
                </th>
              ))}
              {/* Actions col */}
              <th className="sticky top-0 z-20 w-8 border-b bg-muted/80 backdrop-blur-sm" />
            </tr>
          </thead>

          <tbody>
            {/* Existing rows */}
            {rows.map((row, rowIdx) => (
              <tr key={row.id} className="group">
                {/* Row number — fixed w-10, icon overlaid so no layout shift */}
                <td className="border-b border-r bg-muted/30 text-center text-[10px] text-muted-foreground w-10 h-9">
                  <div className="relative flex items-center justify-center w-full h-full">
                    <span className="group-hover:invisible select-none">{rowIdx + 1}</span>
                    <button
                      onClick={() => setHistoryRowId(historyRowId === row.id ? null : row.id)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                      title="Row history"
                    >
                      <History className="size-3" />
                    </button>
                  </div>
                </td>

                {/* Data cells */}
                {visibleCols.map((col) => {
                  const isEditing = editing?.rowIdx === rowIdx && editing?.colKey === col.key
                  const cellError = cellErrors[`${row.id}:${col.key}`]

                  return (
                    <td
                      key={col.key}
                      onClick={() => !isEditing && startEdit(rowIdx, col.key)}
                      className={cn(
                        CELL_BASE,
                        COL_W,
                        "cursor-cell transition-colors relative",
                        isEditing
                          ? "bg-primary/5 ring-1 ring-inset ring-primary z-10"
                          : cellError
                          ? "ring-1 ring-inset ring-red-500/70"
                          : "hover:bg-accent/40",
                      )}
                    >
                      {isEditing ? (
                        <CellEditor
                          col={col}
                          value={editValue}
                          onChange={setEditValue}
                          onCommit={commitEdit}
                          onCancel={cancelEdit}
                          onTab={tabFromExisting}
                        />
                      ) : (
                        <CellDisplay col={col} value={row.data[col.key]} />
                      )}
                      {cellError && (
                        <div className="pointer-events-none absolute top-full left-0 z-50 mt-0.5 max-w-[220px] rounded-md bg-destructive px-2 py-1 text-[10px] leading-tight text-destructive-foreground shadow-lg">
                          {cellError}
                        </div>
                      )}
                    </td>
                  )
                })}

                {/* Row actions */}
                <td className="border-b px-1 text-center w-8 h-9">
                  {saving === row.id ? (
                    <Loader2 className="size-3 animate-spin text-muted-foreground mx-auto" />
                  ) : (
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Draft (new) rows */}
            {draftRows.map((draft, draftIdx) => (
              <tr key={`draft_${draftIdx}`} className="group bg-primary/[0.02]">
                <td className="border-b border-r bg-primary/5 px-2 text-center text-[10px] text-muted-foreground w-10 h-9">
                  <span className="text-primary font-semibold">*</span>
                </td>
                {visibleCols.map((col) => {
                  const isEditing = draftEditing?.draftIdx === draftIdx && draftEditing?.colKey === col.key
                  return (
                    <td
                      key={col.key}
                      onClick={() => !isEditing && startDraftEdit(draftIdx, col.key)}
                      className={cn(
                        CELL_BASE,
                        COL_W,
                        "cursor-cell",
                        isEditing
                          ? "bg-primary/10 ring-1 ring-inset ring-primary z-10 relative"
                          : "hover:bg-accent/40",
                      )}
                    >
                      {isEditing ? (
                        <CellEditor
                          col={col}
                          value={draftValue}
                          onChange={setDraftValue}
                          onCommit={() => { commitDraftCell() }}
                          onCancel={() => { setDraftEditing(null); setDraftValue(null) }}
                          onTab={tabFromDraft}
                        />
                      ) : (
                        <CellDisplay col={col} value={draft.data[col.key]} />
                      )}
                    </td>
                  )
                })}
                <td className="border-b px-1 text-center w-8 h-9">
                  {savingDraft ? (
                    <Loader2 className="size-3 animate-spin text-muted-foreground mx-auto" />
                  ) : (
                    <button
                      onClick={() => setDraftRows((prev) => prev.filter((_, i) => i !== draftIdx))}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Add row button row */}
            <tr>
              <td
                colSpan={visibleCols.length + 2}
                className="border-b py-1 px-3"
              >
                <button
                  onClick={() => { addDraftRow(); setTimeout(() => startDraftEdit(draftRows.length, visibleCols[0]?.key ?? ""), 50) }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1 rounded hover:bg-accent/40 w-full"
                >
                  <Plus className="size-3.5" />
                  Add row
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Empty state */}
        {rows.length === 0 && draftRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No rows yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click "Add row" above or press the button in the toolbar.</p>
          </div>
        )}
      </div>{/* /grid scroll area */}
      </div>{/* /left flex-col */}

      {/* Error toast — only for delete / draft-save failures */}
      {Object.keys(errors).length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {Object.entries(errors).map(([id, msg]) => (
            <div key={id} className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-lg">
              <AlertCircle className="size-3.5 shrink-0" />
              {msg}
              <button onClick={() => setErrors((p) => { const n = { ...p }; delete n[id]; return n })}><X className="size-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Row history panel (outside the column wrapper so it spans full height) */}
      {historyRowId && (
        <RowHistoryPanel
          orgId={orgId}
          tableId={table.id}
          rowId={historyRowId}
          onClose={() => setHistoryRowId(null)}
        />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 200

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

  const [addingColumn, setAddingColumn] = useState(false)
  const [importing, setImporting] = useState(false)

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
    // Use full viewport height minus sidebar — override the max-w-4xl from layout
    <div className="-mx-6 -mt-6 flex flex-col" style={{ height: "100vh" }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2 bg-background shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/tables")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{table.name}</h1>
            {table.description && (
              <p className="text-[11px] text-muted-foreground truncate">{table.description}</p>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground ml-2">
            {total.toLocaleString()} row{total !== 1 ? "s" : ""}
            {rowsLoading && <Loader2 className="ml-1.5 inline size-3 animate-spin" />}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search…"
            className="h-7 w-36 text-xs"
          />

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs hover:bg-accent transition-colors">
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
              <DropdownMenuItem onClick={() => { if (table && orgId) loadRows(table, search, offset) }}>
                <RefreshCw className="size-3.5 mr-2" /> Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex flex-1 overflow-hidden">
        <SpreadsheetGrid
          orgId={orgId}
          table={table}
          rows={rows}
          onRowsChanged={() => loadRows(table, search, offset)}
        />
      </div>

      {/* ── Pagination ── */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground shrink-0 bg-background">
          <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-6 text-xs" disabled={offset === 0}
              onClick={() => { const o = Math.max(0, offset - PAGE_SIZE); setOffset(o); loadRows(table, search, o) }}>
              Previous
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs" disabled={offset + PAGE_SIZE >= total}
              onClick={() => { const o = offset + PAGE_SIZE; setOffset(o); loadRows(table, search, o) }}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
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
