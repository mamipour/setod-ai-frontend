"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Table2, Loader2, ChevronRight, FileSpreadsheet, Trash2 } from "lucide-react"
import { tablesApi, type OrgTable, type TablePreset } from "@/lib/api"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { DeleteTableDialog } from "@/components/tables/DeleteTableDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { needsExplicitKey, isValidKey, KEY_RULE_MSG } from "@/lib/slug"

// ── Preset picker card ─────────────────────────────────────────────────────────
function PresetCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent/50",
        selected && "border-primary bg-primary/5",
      )}
    >
      <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}

// ── Create dialog ──────────────────────────────────────────────────────────────
function CreateTableDialog({
  open,
  onClose,
  onCreated,
  orgId,
}: {
  open: boolean
  onClose: () => void
  onCreated: (t: OrgTable) => void
  orgId: string
}) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")          // explicit English key, only asked for when needed
  const [description, setDescription] = useState("")
  const [presets, setPresets] = useState<Record<string, TablePreset>>({})
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // A Persian/Cyrillic/CJK name has no faithful ASCII form, so the agent-facing key must be typed.
  const askForKey = needsExplicitKey(name)

  useEffect(() => {
    if (!open || !orgId) return
    tablesApi.listPresets(orgId).then(setPresets).catch(() => {})
  }, [open, orgId])

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed && !selectedPreset) {
      setError("Name is required.")
      return
    }
    if (askForKey && !isValidKey(slug)) {
      setError(`English key is required for this name: ${KEY_RULE_MSG}.`)
      return
    }
    setSaving(true); setError("")
    try {
      let table: OrgTable
      const explicit = askForKey ? slug.trim() : undefined
      if (selectedPreset) {
        // Create from preset — backend uses the preset's name/columns
        const preset = presets[selectedPreset]
        table = await tablesApi.create(orgId, {
          name: trimmed || preset.name,
          slug: explicit,
          description: description.trim() || preset.description,
          columns: preset.columns,
          unique_on: preset.unique_on,
        })
      } else {
        table = await tablesApi.create(orgId, { name: trimmed, slug: explicit, description: description.trim() })
      }
      onCreated(table)
      setName(""); setSlug(""); setDescription(""); setSelectedPreset(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create table.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New table</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Presets */}
          {Object.keys(presets).length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start from a template</Label>
              <div className="grid gap-2">
                {Object.entries(presets).map(([key, preset]) => (
                  <PresetCard
                    key={key}
                    label={preset.name}
                    description={preset.description}
                    selected={selectedPreset === key}
                    onClick={() => setSelectedPreset(selectedPreset === key ? null : key)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {Object.keys(presets).length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">or blank</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tbl-name" className="text-xs">
              Table name {!selectedPreset && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="tbl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedPreset ? presets[selectedPreset]?.name : "e.g. Leads"}
              className="text-xs"
            />
          </div>
          {askForKey && (
            <div className="space-y-1.5">
              <Label htmlFor="tbl-slug" className="text-xs">
                English key for agents <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tbl-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="e.g. customers"
                className={cn("text-xs font-mono", slug && !isValidKey(slug) && "border-destructive")}
                dir="ltr"
              />
              <p className="text-[11px] text-muted-foreground">
                Agents call tools named <span className="font-mono">{isValidKey(slug) ? slug : "key"}_search</span>,{" "}
                <span className="font-mono">{isValidKey(slug) ? slug : "key"}_create</span>… Use {KEY_RULE_MSG}.
                The table keeps its name &ldquo;{name.trim()}&rdquo; everywhere else.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="tbl-desc" className="text-xs">Description (optional)</Label>
            <textarea
              id="tbl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this table for?"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={2}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={saving} className="text-xs">
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Create table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Table card ─────────────────────────────────────────────────────────────────
function TableCard({ table, onDelete }: { table: OrgTable; onDelete: () => void }) {
  const router = useRouter()
  return (
    // div+role rather than <button>: the delete control is itself a button and
    // nested interactive elements are invalid HTML.
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/tables/${table.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter") router.push(`/tables/${table.id}`) }}
      className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Table2 className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{table.name}</p>
          {table.description && (
            <p className="truncate text-xs text-muted-foreground">{table.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
        <span>{table.columns.length} col{table.columns.length !== 1 ? "s" : ""}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Delete table"
          className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
        <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TablesPage() {
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""
  const [tables, setTables] = useState<OrgTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<OrgTable | null>(null)
  const router = useRouter()

  async function load() {
    if (!orgId) return
    try {
      const data = await tablesApi.list(orgId)
      setTables(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tables.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (orgId) load() }, [orgId])

  function handleCreated(t: OrgTable) {
    setCreating(false)
    router.push(`/tables/${t.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured business data your agents can read and write.
          </p>
        </div>
        <Button size="sm" className="text-xs shrink-0" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" /> New table
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : tables.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <Table2 className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No tables yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a table to give your agents structured data they can query, add to, and update.
          </p>
          <Button size="sm" className="mt-4 text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> Create your first table
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          {tables.map((t) => (
            <TableCard key={t.id} table={t} onDelete={() => setDeleting(t)} />
          ))}
        </div>
      )}

      <CreateTableDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={handleCreated}
        orgId={orgId}
      />
      <DeleteTableDialog
        table={deleting}
        orgId={orgId}
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onDeleted={() => { setDeleting(null); load() }}
      />
    </div>
  )
}
