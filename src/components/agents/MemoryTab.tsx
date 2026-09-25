"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, Database, Loader2, Pencil, Plus, RefreshCw, Trash2, Users, X } from "lucide-react"
import { agents, type MemoryEntry } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const SHARED_PREFIX = "shared:"
const MAX_KEY_LEN = 128
const MAX_VALUE_BYTES = 16 * 1024

/**
 * The agent's exact state between runs - the values it stored with `memory_set`. The point
 * of this tab is that the owner can *see* that state and correct it: reset a "last processed
 * id" after a bad run, seed a value before the first run, delete a key the agent no longer
 * needs. Nothing here is pushed into the prompt; the agent reads values through its tools.
 */
export function MemoryTab({ agentId }: { agentId: string }) {
  const [entries, setEntries] = useState<MemoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const reload = useCallback(async () => {
    try {
      setEntries(await agents.listMemory(agentId))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load memory")
    }
  }, [agentId])

  useEffect(() => {
    let cancelled = false
    agents
      .listMemory(agentId)
      .then((rows) => {
        if (!cancelled) setEntries(rows)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load memory")
      })
    return () => {
      cancelled = true
    }
  }, [agentId])

  const own = useMemo(() => (entries ?? []).filter((e) => !e.shared), [entries])
  const shared = useMemo(() => (entries ?? []).filter((e) => e.shared), [entries])

  async function save(key: string, value: unknown) {
    setError(null)
    try {
      await agents.putMemory(agentId, key, value)
      await reload()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
      return false
    }
  }

  async function remove(key: string) {
    setError(null)
    try {
      await agents.deleteMemory(agentId, key)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete")
    }
  }

  async function clearAll() {
    setClearing(true)
    setError(null)
    try {
      await agents.clearMemory(agentId)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear")
    } finally {
      setClearing(false)
      setConfirmClear(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Memory</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Exact values the agent keeps between runs - the last id it handled, refs it already
            reported, counters. It writes them with <span className="font-mono">memory_set</span>{" "}
            and reads them back with <span className="font-mono">memory_get</span>. Edit a value
            here to correct the agent&apos;s state; it sees the change on its next run.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={reload} title="Refresh">
            <RefreshCw className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="size-3.5" /> Add value
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {adding && (
        <NewEntryRow
          onCancel={() => setAdding(false)}
          onSave={async (key, value) => {
            if (await save(key, value)) setAdding(false)
          }}
        />
      )}

      {entries === null ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Loading…
        </div>
      ) : entries.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Database className="mx-auto size-6 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">Nothing stored yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            The agent stores values when its instructions call for remembering something exact -
            &ldquo;keep track of the last order id you confirmed&rdquo;. You can also seed a value
            now with <em>Add value</em>.
          </p>
        </div>
      ) : (
        <>
          <Section
            title="This agent"
            count={own.length}
            action={
              own.length > 0 && (
                confirmClear ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Delete all {own.length}?</span>
                    <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={clearAll} disabled={clearing}>
                      {clearing && <Loader2 className="mr-1 size-3 animate-spin" />} Yes, clear
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirmClear(false)}>
                      No
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => setConfirmClear(true)}>
                    Clear all
                  </Button>
                )
              )
            }
          >
            {own.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No private keys.</p>
            ) : (
              own.map((e) => <EntryRow key={e.key} entry={e} onSave={save} onDelete={remove} />)
            )}
          </Section>

          {shared.length > 0 && (
            <Section
              title="Shared across the workspace"
              count={shared.length}
              hint="Any agent in this workspace can read and write these. Deleting one affects every agent that uses it."
            >
              {shared.map((e) => <EntryRow key={e.key} entry={e} onSave={save} onDelete={remove} />)}
            </Section>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Limits: keys up to {MAX_KEY_LEN} characters, values up to {MAX_VALUE_BYTES / 1024} KB of
        JSON, 200 keys per agent. Prefix a key with <span className="font-mono">shared:</span> to
        make it visible to every agent in the workspace. Fuzzy recall of past runs is a separate
        setting - see{" "}
        <Link href="/help/memory" className="underline underline-offset-2">Memory</Link> in Help.
      </p>
    </div>
  )
}

// ── Pieces ─────────────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  hint,
  action,
  children,
}: {
  title: string
  count: number
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-muted-foreground">{title}</h4>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{count}</span>
        </div>
        {action}
      </div>
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
      <ul className="divide-y rounded-lg border bg-card">{children}</ul>
    </div>
  )
}

/** JSON for the editor; strings shown bare so "4412" and 4412 are distinguishable by quotes. */
function formatValue(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "null"
}

function previewValue(value: unknown): string {
  const text = JSON.stringify(value) ?? "null"
  return text.length > 120 ? text.slice(0, 119) + "…" : text
}

/** Parse the editor text as JSON; a bare word that is not valid JSON is stored as a string,
 * so typing `hello` works without quotes but `4412` is still stored as a number. */
function parseValue(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim()
  if (trimmed === "") return { ok: false, error: "Value is required." }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch {
    if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith('"')) {
      return { ok: false, error: "That is not valid JSON - check brackets and quotes." }
    }
    return { ok: true, value: trimmed }
  }
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

function EntryRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: MemoryEntry
  onSave: (key: string, value: unknown) => Promise<boolean>
  onDelete: (key: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(() => formatValue(entry.value))
  const [localError, setLocalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function startEdit() {
    setText(formatValue(entry.value))
    setLocalError(null)
    setEditing(true)
  }

  async function commit() {
    const parsed = parseValue(text)
    if (!parsed.ok) {
      setLocalError(parsed.error)
      return
    }
    setSaving(true)
    const ok = await onSave(entry.key, parsed.value)
    setSaving(false)
    if (ok) setEditing(false)
  }

  const bareKey = entry.shared ? entry.key.slice(SHARED_PREFIX.length) : entry.key

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs font-medium">
              {entry.shared && <span className="text-muted-foreground">{SHARED_PREFIX}</span>}
              {bareKey}
            </span>
            {entry.shared && (
              <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Users className="size-2.5" /> shared
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              · {relTime(entry.updated_at)}
              {entry.updated_by_session_id ? (
                <span title={`Run ${entry.updated_by_session_id}`}>
                  {" by run "}
                  <span className="font-mono">{entry.updated_by_session_id.slice(0, 8)}</span>
                </span>
              ) : (
                " by you"
              )}
            </span>
          </div>

          {editing ? (
            <div className="mt-2 space-y-1.5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={Math.min(10, Math.max(2, text.split("\n").length))}
                autoFocus
                className="w-full rounded-lg border border-input bg-transparent p-2 font-mono text-xs leading-relaxed outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditing(false)
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit()
                }}
              />
              {localError && <p className="text-xs text-red-600">{localError}</p>}
              <div className="flex gap-1.5">
                <Button size="sm" className="h-6 px-2 text-xs" onClick={commit} disabled={saving}>
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} Save
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              title="Click to edit"
              className="mt-1 block max-w-full truncate text-left font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              {previewValue(entry.value)}
            </button>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5">
            {confirmDelete ? (
              <>
                <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={() => onDelete(entry.key)}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setConfirmDelete(false)}>
                  <X className="size-3" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="size-7 p-0 text-muted-foreground" onClick={startEdit} title="Edit">
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-7 p-0 text-muted-foreground hover:text-red-600"
                  onClick={() => setConfirmDelete(true)}
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function NewEntryRow({
  onSave,
  onCancel,
}: {
  onSave: (key: string, value: unknown) => Promise<void>
  onCancel: () => void
}) {
  const [key, setKey] = useState("")
  const [text, setText] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function commit() {
    const k = key.trim()
    if (!k || k === SHARED_PREFIX) {
      setLocalError("Key is required.")
      return
    }
    if (k.replace(SHARED_PREFIX, "").length > MAX_KEY_LEN) {
      setLocalError(`Key is too long (max ${MAX_KEY_LEN} characters).`)
      return
    }
    const parsed = parseValue(text)
    if (!parsed.ok) {
      setLocalError(parsed.error)
      return
    }
    setLocalError(null)
    setSaving(true)
    await onSave(k, parsed.value)
    setSaving(false)
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Key</label>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="last_order_id  or  shared:seen_refs"
            className="h-8 font-mono text-xs"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Value (JSON or plain text)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={'4412   or   ["T-101", "T-102"]   or   done'}
            className="w-full rounded-lg border border-input bg-transparent p-2 font-mono text-xs leading-relaxed outline-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel()
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit()
            }}
          />
        </div>
      </div>
      {localError && <p className="text-xs text-red-600">{localError}</p>}
      <div className="flex gap-1.5">
        <Button size="sm" className={cn("h-6 px-2 text-xs")} onClick={commit} disabled={saving}>
          {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} Save
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
