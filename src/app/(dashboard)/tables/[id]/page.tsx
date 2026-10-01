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
  EyeOff,
  Pencil,
  Type,
  ListChecks,
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
import { DeleteTableDialog } from "@/components/tables/DeleteTableDialog"
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { deriveSlug, needsExplicitKey, isValidKey, uniqueKey, KEY_RULE_MSG } from "@/lib/slug"

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
  onEnter,
  onCancel,
  onTab,
}: {
  col: ColumnDef
  value: unknown
  onChange: (v: unknown) => void
  /** Called on blur and, unless onEnter is given, on Enter. */
  onCommit: () => void
  /** Optional Enter override — draft rows use it to save the whole row. */
  onEnter?: () => void
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (onEnter ?? onCommit)() }
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
          // Plain Enter is a newline in long text; Ctrl/Cmd+Enter commits.
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); (onEnter ?? onCommit)() }
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

  // Date parsing never throws; an unparseable value falls through to the raw string below.
  if ((col.type === "datetime" || col.type === "date") && typeof value === "string") {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) {
      return <span>{col.type === "datetime" ? d.toLocaleString() : d.toLocaleDateString()}</span>
    }
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
  const [key, setKey] = useState("")              // explicit English key, only asked for when needed
  const [type, setType] = useState<ColumnType>("text")
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const askForKey = needsExplicitKey(name)

  async function handle() {
    if (!name.trim()) { setError("Name is required."); return }
    if (askForKey && !isValidKey(key)) { setError(`English key is required for this name: ${KEY_RULE_MSG}.`); return }
    setSaving(true); setError("")
    try {
      const col: ColumnDef = {
        key: askForKey ? key.trim() : (deriveSlug(name) ?? ""),
        name: name.trim(),
        type,
        required,
        options: type === "select" ? options.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      }
      const t = await tablesApi.addColumn(orgId, tableId, col)
      onAdded(t)
      setName(""); setKey(""); setType("text"); setRequired(false); setOptions("")
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
          {askForKey && (
            <div className="space-y-1">
              <Label className="text-xs">English key for agents *</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase())}
                placeholder="e.g. status"
                dir="ltr"
                className={cn("text-xs font-mono", key && !isValidKey(key) && "border-destructive")}
              />
              <p className="text-[11px] text-muted-foreground">
                Agents refer to this column as <span className="font-mono">{isValidKey(key) ? key : "key"}</span>; the column
                is still shown as &ldquo;{name.trim()}&rdquo;. Use {KEY_RULE_MSG}.
              </p>
            </div>
          )}
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
  onTableChanged,
}: {
  orgId: string
  table: OrgTable
  rows: OrgTableRow[]
  onRowsChanged: () => void
  onTableChanged: (t: OrgTable) => void
}) {
  // Humans see every column; `hidden_from_agents` only affects agent tools (marked with an icon).
  const visibleCols = table.columns

  // ── Column (schema) editing — Excel-style, from the header row ───────────────
  const [addingCol, setAddingCol] = useState(false)
  const [newColName, setNewColName] = useState("")
  const [newColKey, setNewColKey] = useState("")   // explicit English key; shown only for non-Latin names
  const newColNeedsKey = needsExplicitKey(newColName)
  const newColKeyRef = useRef<HTMLInputElement>(null)
  const [renamingKey, setRenamingKey] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [colBusy, setColBusy] = useState(false)
  const [colError, setColError] = useState("")
  const [optionsCol, setOptionsCol] = useState<ColumnDef | null>(null)   // editing select options
  const [deletingCol, setDeletingCol] = useState<ColumnDef | null>(null)
  const newColInputRef = useRef<HTMLInputElement>(null)
  // Guards against Enter + the blur that disabling the input triggers in some browsers → double create
  const creatingColRef = useRef(false)

  function showColError(e: unknown) {
    setColError(e instanceof Error ? e.message : "Column change failed")
    setTimeout(() => setColError(""), 6000)
  }

  /**
   * Resolve the key for a new column: the explicit key when the name has no Latin letters,
   * otherwise derived from the name (same rule as the backend), de-duplicated against existing keys.
   * Returns null when an explicit key is needed but missing/invalid — the caller reveals the key input.
   */
  function resolveColKey(name: string, explicit: string): string | null {
    const existing = table.columns.map((c) => c.key)
    if (needsExplicitKey(name)) return isValidKey(explicit) ? uniqueKey(explicit.trim(), existing) : null
    const derived = deriveSlug(name)
    return derived ? uniqueKey(derived, existing) : null
  }

  /** Create a new text column from the inline header input. Returns true on success. */
  async function createColumn(name: string, explicitKey = ""): Promise<boolean> {
    const trimmed = name.trim()
    if (!trimmed || creatingColRef.current) return false
    const key = resolveColKey(trimmed, explicitKey)
    if (!key) {
      // Non-Latin name without a valid key: focus the key input instead of failing.
      setTimeout(() => newColKeyRef.current?.focus(), 0)
      return false
    }
    creatingColRef.current = true
    setColBusy(true)
    try {
      const t = await tablesApi.addColumn(orgId, table.id, { key, name: trimmed, type: "text" })
      onTableChanged(t)
      return true
    } catch (e) { showColError(e); return false } finally { creatingColRef.current = false; setColBusy(false) }
  }

  async function patchColumn(key: string, body: Partial<ColumnDef>) {
    setColBusy(true)
    try { onTableChanged(await tablesApi.updateColumn(orgId, table.id, key, body)) }
    catch (e) { showColError(e) } finally { setColBusy(false) }
  }

  async function removeColumn(key: string) {
    setColBusy(true)
    try { onTableChanged(await tablesApi.removeColumn(orgId, table.id, key)); setDeletingCol(null) }
    catch (e) { showColError(e) } finally { setColBusy(false) }
  }

  function startRename(col: ColumnDef) { setRenamingKey(col.key); setRenameValue(col.name) }
  async function commitRename() {
    if (!renamingKey) return
    const key = renamingKey, value = renameValue.trim()
    const col = table.columns.find((c) => c.key === key)
    setRenamingKey(null)
    if (col && value && value !== col.name) await patchColumn(key, { name: value })
  }

  /** Type change: switching to `select` needs options first, so route through the options dialog. */
  function changeType(col: ColumnDef, type: ColumnType) {
    if (type === col.type) return
    if (type === "select") { setOptionsCol({ ...col, type: "select", options: col.options ?? [] }); return }
    patchColumn(col.key, { type })
  }

  // Focus the "+" input when it opens
  useEffect(() => { if (addingCol) newColInputRef.current?.focus() }, [addingCol])

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
  // Ref that's always in sync with editValue — lets commitEdit read the latest
  // value synchronously even when called in the same event as onChange (select).
  const editValueRef = useRef<unknown>(null)
  function applyEditValue(v: unknown) {
    editValueRef.current = v
    setEditValue(v)
  }
  const [saving, setSaving] = useState<string | null>(null) // rowId being saved
  const [historyRowId, setHistoryRowId] = useState<string | null>(null)
  // Cell-level validation errors: key = `${rowId}:${colKey}`
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({})
  // Row pending delete confirmation
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  // Draft new rows (pending creation)
  const [draftRows, setDraftRows] = useState<DraftRow[]>([])
  const [draftEditing, setDraftEditing] = useState<{ draftIdx: number; colKey: string } | null>(null)
  const [draftValue, setDraftValue] = useState<unknown>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  // Refs mirror draft state so commit → save can run in one event without waiting
  // for React to flush (same reason editValueRef exists for existing rows).
  const draftRowsRef = useRef<DraftRow[]>([])
  const draftValueRef = useRef<unknown>(null)
  function updateDraftRows(next: DraftRow[]) {
    draftRowsRef.current = next
    setDraftRows(next)
  }
  function applyDraftValue(v: unknown) {
    draftValueRef.current = v
    setDraftValue(v)
  }
  const [errors, setErrors] = useState<Record<string, string>>({}) // rowId → error (delete/draft ops only)

  // ── Cell click ────────────────────────────────────────────────────────────────
  function startEdit(rowIdx: number, colKey: string) {
    const row = rows[rowIdx]
    setEditing({ rowIdx, colKey })
    applyEditValue(row.data[colKey] ?? null)
    setDraftEditing(null)
  }

  function startDraftEdit(draftIdx: number, colKey: string) {
    setDraftEditing({ draftIdx, colKey })
    applyDraftValue(draftRowsRef.current[draftIdx]?.data[colKey] ?? null)
    setEditing(null)
  }

  // ── Commit existing row cell ─────────────────────────────────────────────────
  async function commitEdit() {
    if (!editing) return
    const row = rows[editing.rowIdx]
    const col = visibleCols.find((c) => c.key === editing.colKey)
    if (!row || !col) { setEditing(null); return }

    // No change? Read from ref so select commits work synchronously.
    const prev = row.data[editing.colKey]
    const cur = editValueRef.current
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

  function cancelEdit() { setEditing(null); applyEditValue(null) }

  // ── Commit draft row cell ─────────────────────────────────────────────────────
  /** Folds the cell being edited into its draft row. Returns the draft index so a
   *  caller can save that row in the same event. */
  function commitDraftCell(): number | null {
    if (!draftEditing) return null
    const { draftIdx, colKey } = draftEditing
    const v = draftValueRef.current
    const copy = [...draftRowsRef.current]
    if (copy[draftIdx]) {
      copy[draftIdx] = { data: { ...copy[draftIdx].data, [colKey]: v === "" ? null : v } }
      updateDraftRows(copy)
    }
    setDraftEditing(null); applyDraftValue(null)
    return draftIdx
  }

  // ── Save a draft row ─────────────────────────────────────────────────────────
  /** Creates the row. Returns true on success (or when the draft was empty and simply dropped). */
  async function saveDraftRow(draftIdx: number): Promise<boolean> {
    const draft = draftRowsRef.current[draftIdx]
    if (!draft) return false
    const hasData = Object.values(draft.data).some((v) => v != null && v !== "")
    if (!hasData) {
      updateDraftRows(draftRowsRef.current.filter((_, i) => i !== draftIdx))
      return true
    }
    setSavingDraft(true)
    try {
      await tablesApi.createRow(orgId, table.id, draft.data)
      updateDraftRows(draftRowsRef.current.filter((_, i) => i !== draftIdx))
      onRowsChanged()
      return true
    } catch (e: unknown) {
      const key = `draft_${draftIdx}`
      setErrors((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : "Save failed" }))
      setTimeout(() => setErrors((p) => { const n = { ...p }; delete n[key]; return n }), 6000)
      return false
    } finally {
      setSavingDraft(false)
    }
  }

  /** Enter in a draft cell: commit the cell and save the whole row. */
  function saveDraftFromCell() {
    const idx = commitDraftCell()
    if (idx !== null) saveDraftRow(idx)
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
        // Move to first draft, or open a new one
        const idx = draftRowsRef.current.length > 0 ? 0 : addDraftRow()
        setTimeout(() => startDraftEdit(idx, visibleCols[0].key), 50)
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
    const colIdx = visibleCols.findIndex((c) => c.key === draftEditing.colKey)
    const draftIdx = commitDraftCell()
    if (draftIdx === null) return
    if (!shift) {
      if (colIdx < visibleCols.length - 1) {
        setTimeout(() => startDraftEdit(draftIdx, visibleCols[colIdx + 1].key), 10)
      } else {
        // Past the last cell: save this draft and open a fresh one so entry can continue.
        saveDraftRow(draftIdx).then((ok) => {
          if (!ok) return // keep the draft on screen with its error
          const newIdx = addDraftRow()
          setTimeout(() => startDraftEdit(newIdx, visibleCols[0].key), 50)
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

  /** Appends an empty draft and returns its index. */
  function addDraftRow(): number {
    const next = [...draftRowsRef.current, { data: {} }]
    updateDraftRows(next)
    return next.length - 1
  }

  function discardDraft(draftIdx: number) {
    if (draftEditing?.draftIdx === draftIdx) { setDraftEditing(null); applyDraftValue(null) }
    updateDraftRows(draftRowsRef.current.filter((_, i) => i !== draftIdx))
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
              <th className="sticky top-0 z-20 border-b border-r bg-muted/80 backdrop-blur-sm" style={{ width: 64, minWidth: 64 }} />
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  onDoubleClick={() => startRename(col)}
                  title={renamingKey === col.key ? undefined : "Double-click to rename"}
                  className={cn(
                    "group/th sticky top-0 z-20 border-b border-r bg-muted/80 backdrop-blur-sm",
                    "px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                    COL_W,
                  )}
                >
                  {renamingKey === col.key ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitRename() }
                        if (e.key === "Escape") { e.preventDefault(); setRenamingKey(null) }
                      }}
                      className="w-full bg-transparent normal-case tracking-normal font-semibold text-foreground outline-none ring-1 ring-primary rounded px-1 -mx-1"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="truncate">{col.name}</span>
                      {col.required && <span className="text-destructive">*</span>}
                      {col.hidden_from_agents && (
                        <EyeOff className="size-3 shrink-0 text-muted-foreground/60" aria-label="Hidden from agents" />
                      )}
                      <span className="ml-auto text-[9px] font-normal normal-case tracking-normal text-muted-foreground/50 group-hover/th:hidden">
                        {COLUMN_TYPES.find((t) => t.value === col.type)?.label}
                      </span>
                      {/* Column menu — appears on hover, like Excel's header dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="ml-auto hidden group-hover/th:inline-flex data-[popup-open]:inline-flex rounded p-0.5 hover:bg-accent text-muted-foreground"
                          onDoubleClick={(e) => e.stopPropagation()}
                        >
                          <ChevronDown className="size-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="text-xs min-w-[180px]">
                          <DropdownMenuItem onClick={() => startRename(col)}>
                            <Pencil className="size-3.5 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Type className="size-3.5 mr-2" /> Type: {COLUMN_TYPES.find((t) => t.value === col.type)?.label}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="text-xs">
                              <DropdownMenuRadioGroup value={col.type} onValueChange={(v) => changeType(col, v as ColumnType)}>
                                {COLUMN_TYPES.filter((t) => t.value !== "link").map((t) => (
                                  <DropdownMenuRadioItem key={t.value} value={t.value}>{t.label}</DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {col.type === "select" && (
                            <DropdownMenuItem onClick={() => setOptionsCol(col)}>
                              <ListChecks className="size-3.5 mr-2" /> Edit options…
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem
                            checked={!!col.required}
                            onCheckedChange={(v) => patchColumn(col.key, { required: !!v })}
                          >
                            Required
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={!!col.hidden_from_agents}
                            onCheckedChange={(v) => patchColumn(col.key, { hidden_from_agents: !!v })}
                          >
                            Hidden from agents
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingCol(col)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5 mr-2" /> Delete column
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </th>
              ))}

              {/* "+" column — type a name and press Enter, like a new Excel header */}
              <th
                className="sticky top-0 z-20 border-b border-r bg-muted/80 backdrop-blur-sm px-1 py-1 text-left"
                style={addingCol ? { width: newColNeedsKey ? 340 : 180, minWidth: newColNeedsKey ? 340 : 180 } : { width: 40, minWidth: 40 }}
              >
                {addingCol ? (
                  <div
                    className="flex items-center gap-1"
                    // One blur handler for the pair, so tabbing name → key doesn't count as leaving.
                    onBlur={async (e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                      if (creatingColRef.current) return   // Enter/Tab already handling it
                      // Blur with text behaves like Enter; blur empty (or unresolved key) just closes.
                      if (newColName.trim()) await createColumn(newColName, newColKey)
                      setNewColName(""); setNewColKey(""); setAddingCol(false)
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Escape") { e.preventDefault(); setNewColName(""); setNewColKey(""); setAddingCol(false); return }
                      // Tab from the name field moves to the key field when one is needed.
                      if (e.key === "Tab" && !e.shiftKey && newColNeedsKey && e.target === newColInputRef.current) return
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault()
                        const ok = await createColumn(newColName, newColKey)
                        if (!ok) return
                        setNewColName(""); setNewColKey("")
                        // Tab keeps adding columns; Enter is done.
                        if (e.key === "Enter") setAddingCol(false)
                        else newColInputRef.current?.focus()
                      }
                    }}
                  >
                    <input
                      ref={newColInputRef}
                      value={newColName}
                      disabled={colBusy}
                      placeholder="Column name"
                      onChange={(e) => setNewColName(e.target.value)}
                      className="h-6 min-w-0 flex-1 rounded bg-background px-1.5 text-[11px] font-semibold text-foreground outline-none ring-1 ring-primary"
                    />
                    {newColNeedsKey && (
                      <input
                        ref={newColKeyRef}
                        value={newColKey}
                        disabled={colBusy}
                        dir="ltr"
                        placeholder="english_key"
                        title={`Key agents use for this column — ${KEY_RULE_MSG}`}
                        onChange={(e) => setNewColKey(e.target.value.toLowerCase())}
                        className={cn(
                          "h-6 min-w-0 flex-1 rounded bg-background px-1.5 font-mono text-[11px] normal-case tracking-normal text-foreground outline-none ring-1",
                          newColKey && !isValidKey(newColKey) ? "ring-destructive" : "ring-primary/60",
                        )}
                      />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingCol(true)}
                    disabled={colBusy}
                    title="Add column"
                    className="flex h-6 w-full items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {colBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  </button>
                )}
              </th>
              {/* Actions col */}
              <th className="sticky top-0 z-20 border-b bg-muted/80 backdrop-blur-sm" style={{ width: 72, minWidth: 72 }} />
            </tr>
          </thead>

          <tbody>
            {/* Existing rows */}
            {rows.map((row, rowIdx) => (
              <tr key={row.id} className="group">
                {/* Row number — fixed width enforced via style */}
                <td className="border-b border-r bg-muted/30 text-center text-[10px] text-muted-foreground h-9" style={{ width: 64, minWidth: 64 }}>
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
                          onChange={applyEditValue}
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

                {/* Spacer under the "+" header */}
                <td className="border-b border-r h-9" />
                {/* Row actions */}
                <td className="border-b px-1 text-center h-9" style={{ width: 72, minWidth: 72 }}>
                  {saving === row.id ? (
                    <Loader2 className="size-3 animate-spin text-muted-foreground mx-auto" />
                  ) : pendingDelete === row.id ? (
                    /* Inline confirm */
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { deleteRow(row.id); setPendingDelete(null) }}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-600 text-white hover:bg-red-700"
                        title="Confirm delete"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setPendingDelete(null)}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                        title="Cancel"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPendingDelete(row.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                      title="Delete row"
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
                <td className="border-b border-r bg-primary/5 px-2 text-center h-9" style={{ width: 64, minWidth: 64 }}>
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">new</span>
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
                          onChange={applyDraftValue}
                          onCommit={() => { commitDraftCell() }}
                          onEnter={saveDraftFromCell}
                          onCancel={() => { setDraftEditing(null); applyDraftValue(null) }}
                          onTab={tabFromDraft}
                        />
                      ) : (
                        <CellDisplay col={col} value={draft.data[col.key]} />
                      )}
                    </td>
                  )
                })}
                <td className="border-b border-r h-9" />
                {/* Draft actions — always visible so saving is discoverable */}
                <td className="border-b px-1 text-center h-9" style={{ width: 72, minWidth: 72 }}>
                  {savingDraft ? (
                    <Loader2 className="size-3 animate-spin text-muted-foreground mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        // preventDefault keeps the active cell from blurring (and committing) first
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { const idx = commitDraftCell(); saveDraftRow(idx ?? draftIdx) }}
                        title="Save row (Enter)"
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => discardDraft(draftIdx)}
                        title="Discard"
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {/* Add row button row */}
            <tr>
              <td
                colSpan={visibleCols.length + 3}
                className="border-b py-1 px-3"
              >
                <button
                  onClick={() => { const idx = addDraftRow(); setTimeout(() => startDraftEdit(idx, visibleCols[0]?.key ?? ""), 50) }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1 rounded hover:bg-accent/40 w-full"
                >
                  <Plus className="size-3.5" />
                  Add row
                  <span className="ml-auto text-[10px] text-muted-foreground/60">Enter or Save commits a new row</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Empty state */}
        {rows.length === 0 && draftRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No rows yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click &ldquo;Add row&rdquo; above to start entering data.</p>
          </div>
        )}
      </div>{/* /grid scroll area */}
      </div>{/* /left flex-col */}

      {/* Error toast — delete / draft-save / column-schema failures */}
      {(Object.keys(errors).length > 0 || colError) && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {colError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-lg">
              <AlertCircle className="size-3.5 shrink-0" />
              {colError}
              <button onClick={() => setColError("")}><X className="size-3" /></button>
            </div>
          )}
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

      {/* Column dialogs */}
      <SelectOptionsDialog
        col={optionsCol}
        busy={colBusy}
        onClose={() => setOptionsCol(null)}
        onSave={async (options) => {
          if (!optionsCol) return
          await patchColumn(optionsCol.key, { type: "select", options })
          setOptionsCol(null)
        }}
      />
      <Dialog open={!!deletingCol} onOpenChange={(o) => !o && setDeletingCol(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete column &ldquo;{deletingCol?.name}&rdquo;?</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            The column is removed from the table and from every agent&apos;s view of it. Values already stored
            in this column stay in the row data and in history, but are no longer shown or editable.
          </p>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDeletingCol(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" className="text-xs" disabled={colBusy}
              onClick={() => deletingCol && removeColumn(deletingCol.key)}>
              {colBusy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}Delete column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Select options dialog (used when a column becomes / is a select) ─────────
function SelectOptionsDialog({
  col,
  busy,
  onClose,
  onSave,
}: {
  col: ColumnDef | null
  busy: boolean
  onClose: () => void
  onSave: (options: string[]) => void
}) {
  return (
    <Dialog open={!!col} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Options for &ldquo;{col?.name}&rdquo;</DialogTitle></DialogHeader>
        {/* Keyed by column so the textarea state resets when a different column is opened */}
        {col && <SelectOptionsForm key={col.key} col={col} busy={busy} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  )
}

function SelectOptionsForm({
  col,
  busy,
  onClose,
  onSave,
}: {
  col: ColumnDef
  busy: boolean
  onClose: () => void
  onSave: (options: string[]) => void
}) {
  const [text, setText] = useState((col.options ?? []).join("\n"))
  const options = text.split(/\n|,/).map((s) => s.trim()).filter(Boolean)

  return (
    <>
        <div className="space-y-1">
          <Label className="text-xs">One option per line</Label>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"New\nIn Progress\nDone"}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground">
            Existing values that aren&apos;t in the list stay stored but will fail validation when edited.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs" disabled={busy || options.length === 0} onClick={() => onSave(options)}>
            {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}Save
          </Button>
        </DialogFooter>
    </>
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
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmingDelete(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-3.5 mr-2" /> Delete table
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
          onTableChanged={setTable}
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
      <DeleteTableDialog
        table={table}
        orgId={orgId}
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onDeleted={() => router.push("/tables")}
      />
    </div>
  )
}
