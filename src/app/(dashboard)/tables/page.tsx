"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Table2, Loader2, ChevronRight, FileSpreadsheet } from "lucide-react"
import { tablesApi, type OrgTable, type TablePreset } from "@/lib/api"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
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
  const [description, setDescription] = useState("")
  const [presets, setPresets] = useState<Record<string, TablePreset>>({})
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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
    setSaving(true); setError("")
    try {
      let table: OrgTable
      if (selectedPreset) {
        // Create from preset — backend uses the preset's name/columns
        const preset = presets[selectedPreset]
        table = await tablesApi.create(orgId, {
          name: trimmed || preset.name,
          description: description.trim() || preset.description,
          columns: preset.columns,
          unique_on: preset.unique_on,
        })
      } else {
        table = await tablesApi.create(orgId, { name: trimmed, description: description.trim() })
      }
      onCreated(table)
      setName(""); setDescription(""); setSelectedPreset(null)
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
function TableCard({ table }: { table: OrgTable }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/tables/${table.id}`)}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
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
        <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
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
            <TableCard key={t.id} table={t} />
          ))}
        </div>
      )}

      <CreateTableDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={handleCreated}
        orgId={orgId}
      />
    </div>
  )
}
