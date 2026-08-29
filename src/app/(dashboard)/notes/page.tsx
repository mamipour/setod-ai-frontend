"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Clock, RotateCcw, StickyNote, Trash2, X } from "lucide-react"
import { agents as agentsApi, notes as notesApi, type Agent, type OwnerNote } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MAX_BODY = 500

// ── Helpers ──────────────────────────────────────────────────────────────────

function isLive(n: OwnerNote): boolean {
  if (n.resolved_at) return false
  if (n.expires_at && new Date(n.expires_at) <= new Date()) return false
  return true
}

function isResolved(n: OwnerNote): boolean {
  return !!n.resolved_at
}

function isExpired(n: OwnerNote): boolean {
  return !n.resolved_at && !!n.expires_at && new Date(n.expires_at) <= new Date()
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function agentLabel(agents: Agent[], id: string | null): string {
  if (!id) return "Unknown agent"
  const found = agents.find((a) => a.id === id)
  return found ? found.name : id.slice(0, 8)
}

// ── Composer ─────────────────────────────────────────────────────────────────

function Composer({
  orgId,
  agents,
  onCreated,
}: {
  orgId: string
  agents: Agent[]
  onCreated: () => void
}) {
  const [body, setBody] = useState("")
  const [agentResolvable, setAgentResolvable] = useState(false)
  const [expiryPreset, setExpiryPreset] = useState("never")
  const [customDate, setCustomDate] = useState("")
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [allAgents, setAllAgents] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function expiresAt(): string | null {
    if (expiryPreset === "today") {
      const d = new Date()
      d.setHours(23, 59, 59, 999)
      return d.toISOString()
    }
    if (expiryPreset === "week") {
      const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      d.setHours(23, 59, 59, 999)
      return d.toISOString()
    }
    if (expiryPreset === "custom" && customDate) {
      return new Date(customDate + "T23:59:59").toISOString()
    }
    return null
  }

  async function submit() {
    const trimmed = body.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      await notesApi.create(orgId, {
        body: trimmed,
        agent_ids: allAgents ? null : selectedAgentIds.length ? selectedAgentIds : null,
        expires_at: expiresAt(),
        agent_resolvable: agentResolvable,
      })
      setBody("")
      setAgentResolvable(false)
      setExpiryPreset("never")
      setCustomDate("")
      setAllAgents(true)
      setSelectedAgentIds([])
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add note")
    } finally {
      setSaving(false)
    }
  }

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
        }}
        placeholder={`e.g. Closed Aug 4 for the long weekend\ne.g. Don't promise same-day service this week\ne.g. Kevin doesn't take bookings before 10am`}
        className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[72px]"
        rows={3}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={body.length > MAX_BODY * 0.85 ? (body.length > MAX_BODY ? "text-red-500" : "text-amber-500") : ""}>
          {body.length > MAX_BODY * 0.85 ? `${body.length} / ${MAX_BODY}` : ""}
        </span>
        <span className="text-[10px]">⌘↵ to add</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
        {/* Visible to */}
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Visible to</p>
          <select
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
            value={allAgents ? "all" : "specific"}
            onChange={(e) => setAllAgents(e.target.value === "all")}
          >
            <option value="all">All agents</option>
            <option value="specific">Specific agents…</option>
          </select>
          {!allAgents && agents.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAgent(a.id)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                    selectedAgentIds.includes(a.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expires */}
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Expires</p>
          <select
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
            value={expiryPreset}
            onChange={(e) => setExpiryPreset(e.target.value)}
          >
            <option value="never">Never</option>
            <option value="today">End of today</option>
            <option value="week">In one week</option>
            <option value="custom">Custom date…</option>
          </select>
          {expiryPreset === "custom" && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-7 text-xs"
            />
          )}
        </div>

        {/* Task toggle */}
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Type</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-muted/50">
            <input
              type="checkbox"
              checked={agentResolvable}
              onChange={(e) => setAgentResolvable(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span>Agents can mark this done</span>
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Agents see note changes immediately — no republish needed.
        </p>
        <Button
          size="sm"
          className="text-xs"
          disabled={!body.trim() || body.length > MAX_BODY || saving}
          onClick={submit}
        >
          Add note
        </Button>
      </div>
    </div>
  )
}

// ── NoteCard ──────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  agents,
  onDelete,
  onUpdate,
  onReopen,
  dimmed,
}: {
  note: OwnerNote
  agents: Agent[]
  onDelete: () => void
  onUpdate: (data: Partial<OwnerNote>) => void
  onReopen?: () => void
  dimmed?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(note.body)
  const [saving, setSaving] = useState(false)

  async function saveEdit() {
    if (!editBody.trim() || editBody === note.body) { setEditing(false); return }
    setSaving(true)
    try {
      onUpdate({ body: editBody.trim() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const scopeLabel = note.agent_ids?.length
    ? note.agent_ids.map((id) => agentLabel(agents, id)).join(", ")
    : "All agents"

  const meta = [
    "You",
    relativeTime(note.created_at),
    scopeLabel,
    note.expires_at ? `expires ${new Date(note.expires_at).toLocaleDateString()}` : null,
    note.agent_resolvable ? "task" : null,
  ].filter(Boolean).join(" · ")

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-2 ${dimmed ? "opacity-60" : ""}`}>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="text-xs" onClick={saveEdit} disabled={saving}>Save</Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setEditing(false); setEditBody(note.body) }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p
          className="text-sm cursor-text whitespace-pre-wrap"
          onClick={() => !dimmed && setEditing(true)}
          title={dimmed ? undefined : "Click to edit"}
        >
          {note.body}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">{meta}</p>
        <div className="flex items-center gap-1">
          {note.agent_resolvable && note.resolved_at && onReopen && (
            <button
              onClick={onReopen}
              title="Reopen task"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
          {!dimmed && (
            <button
              onClick={() => {
                if (confirm("Delete this note?")) onDelete()
              }}
              title="Delete"
              className="rounded-md p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          {dimmed && (
            <button
              onClick={() => {
                if (confirm("Delete this note?")) onDelete()
              }}
              title="Delete"
              className="rounded-md p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {note.resolved_at && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="font-medium">Done</span>
          {note.resolved_by && ` · by ${note.resolved_by.slice(0, 8)}`}
          {note.resolution && ` · "${note.resolution}"`}
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ title, count, icon }: { title: string; count: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-sm font-semibold">{title}</h2>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const { user, loading: userLoading } = useUser()
  const orgId = user?.organizations[0]?.id ?? ""

  const [allNotes, setAllNotes] = useState<OwnerNote[]>([])
  const [agentList, setAgentList] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!orgId) return
    setLoading(true)
    try {
      const [ns, as] = await Promise.all([
        notesApi.list(orgId),
        agentsApi.list(orgId),
      ])
      setAllNotes(ns)
      setAgentList(as)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId])

  if (userLoading) return null

  async function handleDelete(id: string) {
    await notesApi.delete(id)
    setAllNotes((prev) => prev.filter((n) => n.id !== id))
  }

  async function handleUpdate(id: string, data: Partial<OwnerNote>) {
    const updated = await notesApi.update(id, data as Parameters<typeof notesApi.update>[1])
    setAllNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
  }

  async function handleReopen(id: string) {
    const updated = await notesApi.reopen(id)
    setAllNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
  }

  const live = allNotes.filter(isLive)
  const resolved = allNotes.filter(isResolved)
  const expired = allNotes.filter(isExpired)

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Short reminders your agents read on every run - like sticky notes on the fridge, but the staff actually reads them.
        </p>
      </div>

      <Composer orgId={orgId} agents={agentList} onCreated={load} />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl border bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : live.length === 0 && resolved.length === 0 && expired.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <StickyNote className="mx-auto size-7 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">No notes yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Add a note above. Facts stay in every prompt; tasks disappear once an agent marks them done.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {live.length > 0 && (
            <div className="space-y-3">
              <SectionLabel title="Live" count={live.length} />
              {live.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  agents={agentList}
                  onDelete={() => handleDelete(n.id)}
                  onUpdate={(data) => handleUpdate(n.id, data)}
                />
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-3">
              <SectionLabel
                title="Done"
                count={resolved.length}
                icon={<CheckCircle2 className="size-4 text-muted-foreground" />}
              />
              {resolved.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  agents={agentList}
                  dimmed
                  onDelete={() => handleDelete(n.id)}
                  onUpdate={(data) => handleUpdate(n.id, data)}
                  onReopen={() => handleReopen(n.id)}
                />
              ))}
            </div>
          )}

          {expired.length > 0 && (
            <div className="space-y-3">
              <SectionLabel
                title="Expired"
                count={expired.length}
                icon={<Clock className="size-4 text-muted-foreground" />}
              />
              {expired.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  agents={agentList}
                  dimmed
                  onDelete={() => handleDelete(n.id)}
                  onUpdate={(data) => handleUpdate(n.id, data)}
                  onReopen={async () => {
                    // Renew: clear expiry and set it 7 days out
                    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    d.setHours(23, 59, 59, 999)
                    const updated = await notesApi.update(n.id, { expires_at: d.toISOString() })
                    setAllNotes((prev) => prev.map((x) => (x.id === n.id ? updated : x)))
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
