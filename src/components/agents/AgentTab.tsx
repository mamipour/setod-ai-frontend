"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { CalendarClock, ChevronDown, Clock, MessageSquare, Play, Plus, RotateCcw, Shield, StickyNote, Trash2 } from "lucide-react"
import {
  agents,
  connectors as connectorsApi,
  notes as notesApi,
  skills as skillsApi,
  type Agent,
  type AgentLink,
  type AgentTool,
  type Connector,
  type ModelList,
  type SchedulePreset,
  type Skill,
  type Trigger,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrainPicker, connectorIconSrc, Modal, TRIGGER_LABEL, untilNow } from "@/components/agents/shared"

type Snapshot = {
  id: string
  version: number
  published_at: string
  model: string
  instructions_preview: string
}
import { cn } from "@/lib/utils"

const TOOL_TYPES = ["gmail", "telegram_bot", "telegram_client", "twilio", "mcp"]


/** Autosaves a field after the user stops typing, rather than on every keystroke. */
function useAutosave<T>(value: T, save: (v: T) => Promise<void>, delay = 700) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setStatus("saving")
    const timer = setTimeout(() => {
      save(value)
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"))
    }, delay)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return status
}

function SaveHint({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null
  return (
    <span
      className={cn(
        "text-xs",
        status === "error" ? "text-red-600" : "text-muted-foreground/60",
      )}
    >
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save"}
    </span>
  )
}

function AgentCallModal({
  open,
  agentId,
  orgId,
  existingLinks,
  onClose,
  onAttached,
}: {
  open: boolean
  agentId: string
  orgId: string
  existingLinks: AgentLink[]
  onClose: () => void
  onAttached: (link: AgentLink) => void
}) {
  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [targetId, setTargetId] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    agents.list(orgId).then((list) => setAllAgents(list))
  }, [open, orgId])

  const linkedIds = new Set(existingLinks.map((l) => l.target_agent_id))
  const choices = allAgents.filter(
    (a) => a.id !== agentId && a.status === "published" && !linkedIds.has(a.id),
  )

  async function submit() {
    if (!targetId || !description.trim()) return
    setSaving(true)
    setError(null)
    try {
      const link = await agents.attachCall(agentId, {
        target_agent_id: targetId,
        description: description.trim(),
      })
      onAttached(link)
      setTargetId("")
      setDescription("")
    } catch (e: unknown) {
      const detail = e && typeof e === "object" && "detail" in e ? String((e as { detail: unknown }).detail) : "Failed to attach"
      setError(detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5 space-y-4 min-w-72">
        <h3 className="text-sm font-semibold">Add an agent to call</h3>
        <p className="text-xs text-muted-foreground">
          Only published agents are shown. The calling model will see your description as the tool description.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="call-target" className="text-xs">Target agent</Label>
          {choices.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center">
              No other published agents available in this workspace.
            </p>
          ) : (
            <select
              id="call-target"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select an agent…</option>
              {choices.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="call-desc" className="text-xs">When should this agent be called?</Label>
          <textarea
            id="call-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Hand off booking requests - include the customer's name and phone number."
            rows={3}
            className="w-full resize-none rounded-md border bg-transparent px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <p className="text-[10px] text-muted-foreground">This becomes the tool description the model reads when deciding whether to call the agent.</p>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <Button
            size="sm"
            className="text-xs"
            disabled={!targetId || !description.trim() || saving}
            onClick={submit}
          >
            {saving ? "Attaching…" : "Attach"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}


export function AgentTab({
  agent,
  orgId,
  onPatch,
}: {
  agent: Agent
  orgId: string
  onPatch: (changes: Partial<Agent>) => void
}) {
  const [name, setName] = useState(agent.name)
  const [instructions, setInstructions] = useState(agent.instructions)
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [tools, setTools] = useState<AgentTool[]>([])
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [presets, setPresets] = useState<SchedulePreset[]>([])
  const [adding, setAdding] = useState(false)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [rollingBack, setRollingBack] = useState<string | null>(null)
  const [orgSkills, setOrgSkills] = useState<Skill[]>([])
  const [attachedSkills, setAttachedSkills] = useState<Skill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [liveNoteCount, setLiveNoteCount] = useState<number | null>(null)
  const [agentCalls, setAgentCalls] = useState<AgentLink[]>([])
  const [addingCall, setAddingCall] = useState(false)

  const nameStatus = useAutosave(name, async (v) => {
    const updated = await agents.update(agent.id, { name: v })
    onPatch({ name: updated.name, has_unpublished_changes: updated.has_unpublished_changes })
  })
  const instructionsStatus = useAutosave(instructions, async (v) => {
    const updated = await agents.update(agent.id, { instructions: v })
    onPatch({ has_unpublished_changes: updated.has_unpublished_changes })
  })

  function reload() {
    agents.listTools(agent.id).then(setTools)
    agents.listTriggers(agent.id).then(setTriggers)
  }

  useEffect(() => {
    connectorsApi.list(orgId).then(setConnectors)
    agents.schedulePresets().then(setPresets)
    agents.publishHistory(agent.id).then(setHistory)
    setSkillsLoading(true)
    Promise.all([skillsApi.list(orgId), skillsApi.listForAgent(agent.id)])
      .then(([all, attached]) => { setOrgSkills(all); setAttachedSkills(attached) })
      .finally(() => setSkillsLoading(false))
    agents.listCalls(agent.id).then(setAgentCalls).catch(() => {})
    // Count notes visible to this agent (scope: all-agents or includes this agent id)
    notesApi.list(orgId).then((all) => {
      const now = new Date()
      const live = all.filter((n) => {
        if (n.resolved_at) return false
        if (n.expires_at && new Date(n.expires_at) <= now) return false
        return n.agent_ids === null || n.agent_ids.includes(agent.id)
      })
      setLiveNoteCount(live.length)
    }).catch(() => {})
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, orgId])

  async function rollback(snapshot: Snapshot) {
    setRollingBack(snapshot.id)
    try {
      const updated = await agents.rollback(agent.id, snapshot.id)
      setInstructions(updated.instructions ?? "")
      onPatch({
        instructions: updated.instructions,
        model: updated.model,
        model_connector_id: updated.model_connector_id,
        settings: updated.settings,
        has_unpublished_changes: updated.has_unpublished_changes,
      })
      setHistoryOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Rollback failed")
    } finally {
      setRollingBack(null)
    }
  }

  const brains = connectors.filter((c) => c.type === "openai" || c.type === "anthropic")
  const attachedIds = new Set(tools.map((t) => t.connector_id))
  const attachable = connectors.filter(
    (c) => TOOL_TYPES.includes(c.type) && !attachedIds.has(c.id) && c.status === "active",
  )

  async function changeBrain(id: string) {
    const updated = await agents.update(agent.id, { model_connector_id: id })
    onPatch({
      model_connector_id: updated.model_connector_id,
      has_unpublished_changes: updated.has_unpublished_changes,
    })
  }

  async function detach(connectorId: string) {
    if (!confirm("Remove this account from the agent? It stays connected to your workspace.")) return
    await agents.detachTool(agent.id, connectorId)
    reload()
  }

  return (
    <div className="space-y-5">
      {/* ── Identity + model ── */}
      <SectionCard title="Identity">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Name</Label>
            <SaveHint status={nameStatus} />
          </div>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">AI brain</Label>
          <div className="flex gap-2">
            <BrainPicker
              brains={brains}
              value={agent.model_connector_id ?? ""}
              onChange={changeBrain}
            />
            {/* Keyed so switching provider remounts with an empty list, rather than showing
                the previous provider's models until the new ones arrive. */}
            <ModelPicker
              key={agent.model_connector_id ?? "none"}
              agentId={agent.id}
              connectorId={agent.model_connector_id}
              model={agent.model}
              onPatch={onPatch}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Instructions ── */}
      <SectionCard title="Instructions">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">What it does and how to behave</Label>
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Clock className="size-3" />
                  {history.length} older version{history.length !== 1 ? "s" : ""}
                </button>
              )}
              <SaveHint status={instructionsStatus} />
            </div>
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </SectionCard>

      {/* ── Publish history modal ── */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} width="max-w-2xl">
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Publish history</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Each publish creates a snapshot. Restore any version to the draft — you can review before going live.
            </p>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {history.map((s) => (
              <SnapshotRow
                key={s.id}
                snapshot={s}
                rollingBack={rollingBack === s.id}
                onRollback={() => rollback(s)}
              />
            ))}
          </div>
          <div className="flex justify-end border-t pt-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Accounts and tools ── */}
      <SectionCard title="Accounts it can use">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Each account gives the agent a set of things it can do.
            </p>
            {attachable.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setAdding(true)}
              >
                <Plus className="size-3" /> Add
              </Button>
            )}
          </div>

          {tools.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
              No accounts attached. This agent can think, but it cannot do anything.
            </p>
          ) : (
            <div className="space-y-3">
              {tools.map((t) => (
                <ToolGroup key={t.id} tool={t} agentId={agent.id} onChange={reload} onDetach={detach} />
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Agent calls ── */}
      <SectionCard title="Agents it can call">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Call a published agent like a tool and get its answer back. The called agent runs with its own accounts and approval rules.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs shrink-0"
              onClick={() => setAddingCall(true)}
            >
              <Plus className="size-3" /> Add
            </Button>
          </div>

          {agentCalls.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
              No agents linked. Add a published agent to delegate tasks to it.
            </p>
          ) : (
            <div className="space-y-2">
              {agentCalls.map((link) => (
                <div key={link.id} className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{link.target_agent_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{link.description}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove call link to "${link.target_agent_name}"?`)) return
                      await agents.detachCall(agent.id, link.id)
                      setAgentCalls((prev) => prev.filter((l) => l.id !== link.id))
                    }}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <AgentCallModal
        open={addingCall}
        agentId={agent.id}
        orgId={orgId}
        existingLinks={agentCalls}
        onClose={() => setAddingCall(false)}
        onAttached={(link) => {
          setAgentCalls((prev) => {
            const without = prev.filter((l) => l.target_agent_id !== link.target_agent_id)
            return [...without, link]
          })
          setAddingCall(false)
        }}
      />

      {/* ── Skills ── */}
      <SectionCard title="Skills">
        <p className="text-xs text-muted-foreground">
          Attach reusable behaviour rules from your{" "}
          <a href="/skills" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Skills library
          </a>
          . Active skills are injected into the agent&apos;s system prompt on every run.
        </p>
        {skillsLoading ? (
          <p className="text-xs text-muted-foreground/60">Loading skills…</p>
        ) : orgSkills.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-4 text-center text-xs text-muted-foreground">
            No skills in your library yet.{" "}
            <a href="/skills" className="underline underline-offset-2 hover:text-foreground">Create one</a>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {orgSkills.map((skill) => {
              const isOn = attachedSkills.some((s) => s.id === skill.id)
              return (
                <button
                  key={skill.id}
                  type="button"
                  title={skill.tagline || skill.name}
                  onClick={async () => {
                    if (isOn) {
                      await skillsApi.detach(agent.id, skill.id)
                      setAttachedSkills((prev) => prev.filter((s) => s.id !== skill.id))
                    } else {
                      await skillsApi.attach(agent.id, skill.id)
                      setAttachedSkills((prev) => [...prev, skill])
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    isOn
                      ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                      : "border-input bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  <span className={cn(
                    "size-1.5 rounded-full",
                    isOn ? "bg-green-500" : "bg-muted-foreground/30",
                  )} />
                  {skill.name}
                </button>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Notes ── */}
      {liveNoteCount !== null && (
        <SectionCard title="Workspace notes">
          <p className="text-xs text-muted-foreground">
            {liveNoteCount === 0 ? (
              <>
                No active notes apply to this agent.{" "}
                <a href="/notes" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Add a note
                </a>{" "}
                to give it real-time context without republishing.
              </>
            ) : (
              <>
                <StickyNote className="mr-1.5 inline size-3.5 text-muted-foreground" />
                <a href="/notes" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  {liveNoteCount} note{liveNoteCount !== 1 ? "s" : ""} apply to this agent
                </a>{" "}
                — injected into every run. Notes bypass publish; changes take effect immediately.
              </>
            )}
          </p>
        </SectionCard>
      )}

      {/* ── Triggers ── */}
      <SectionCard title="When it runs">
        <p className="text-xs text-muted-foreground">
          An agent with no trigger only runs when you press Run.
        </p>
        <TriggerEditor
          agentId={agent.id}
          triggers={triggers}
          presets={presets}
          channelConnectors={connectors.filter(
            (c) => (c.type === "telegram_bot" || c.type === "twilio") && c.status === "active",
          )}
          onChange={reload}
        />
      </SectionCard>

      <Modal open={adding} onClose={() => setAdding(false)}>
        <div className="space-y-4">
          <h3 className="text-base font-semibold">Add an account</h3>
          <div className="space-y-2">
            {attachable.map((c) => (
              <button
                key={c.id}
                onClick={async () => {
                  await agents.attachTool(agent.id, { connector_id: c.id })
                  setAdding(false)
                  reload()
                }}
                className="w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex justify-end border-t pt-3">
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ModelPicker({
  agentId,
  connectorId,
  model,
  onPatch,
}: {
  agentId: string
  connectorId: string | null
  model: string
  onPatch: (changes: Partial<Agent>) => void
}) {
  const [list, setList] = useState<ModelList | null>(null)

  useEffect(() => {
    if (connectorId) agents.models(connectorId).then(setList).catch(() => setList({ models: [] }))
  }, [connectorId])

  if (!connectorId) return null

  // While the list is loading, or if the provider was unreachable, the agent still runs on
  // the provider's default  -  so this degrades to a disabled control, not an error.
  const models = list?.models ?? []
  const placeholder = list === null ? "Loading models…" : `Default (${list.default ?? "provider"})`

  return (
    <select
      value={model}
      disabled={models.length === 0}
      onChange={async (e) => {
        const updated = await agents.update(agentId, { model: e.target.value })
        onPatch({ model: updated.model, has_unpublished_changes: updated.has_unpublished_changes })
      }}
      className="h-8 max-w-[45%] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none disabled:opacity-60"
    >
      <option value="">{placeholder}</option>
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  )
}

/**
 * Each tool pill cycles through three states on click:
 *   on  →  requires approval (shield)  →  off  →  on
 *
 * "Requires approval" means the agent pauses and waits for a human to confirm before
 * the tool actually runs. It is stored as a separate `approval_tools` list alongside
 * `enabled_tools` on the AgentTool row.
 */
function ToolGroup({
  tool,
  agentId,
  onChange,
  onDetach,
}: {
  tool: AgentTool
  agentId: string
  onChange: () => void
  onDetach: (connectorId: string) => void
}) {
  const [busy, setBusy] = useState(false)

  function nextState(t: { enabled: boolean; requires_approval: boolean }) {
    if (!t.enabled) return { enabled: true, approval: false }       // off → on
    if (!t.requires_approval) return { enabled: true, approval: true }  // on → approval
    return { enabled: false, approval: false }                      // approval → off
  }

  async function cycle(name: string, current: { enabled: boolean; requires_approval: boolean }) {
    setBusy(true)
    const { enabled: wantEnabled, approval: wantApproval } = nextState(current)
    const allTools = tool.tools.map((t) => t.name)

    const nextEnabled = tool.tools
      .filter((t) => (t.name === name ? wantEnabled : t.enabled))
      .map((t) => t.name)

    const nextApproval = tool.tools
      .filter((t) => (t.name === name ? wantApproval : t.requires_approval))
      .map((t) => t.name)

    try {
      await agents.attachTool(agentId, {
        connector_id: tool.connector_id,
        alias: tool.alias,
        enabled_tools: nextEnabled.length === allTools.length ? null : nextEnabled,
        approval_tools: nextApproval.length === 0 ? null : nextApproval,
      })
      onChange()
    } finally {
      setBusy(false)
    }
  }

  const iconSrc = connectorIconSrc(tool.connector_type, tool.connector_name)

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {iconSrc ? (
            <Image src={iconSrc} alt="" width={20} height={20} className="shrink-0" />
          ) : (
            <div className="size-5 shrink-0 rounded bg-muted" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{tool.connector_name}</p>
            {tool.connector_status !== "active" && (
              <p className="mt-0.5 text-xs text-amber-700">
                Needs reconnecting - the agent will skip it until then.
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={() => onDetach(tool.connector_id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tool.tools.map((t) => (
          <button
            key={t.name}
            disabled={busy}
            onClick={() => cycle(t.name, t)}
            title={
              t.requires_approval
                ? `${t.description} — requires approval before running`
                : t.description
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs transition-colors disabled:opacity-50",
              !t.enabled && "text-muted-foreground/60 line-through hover:bg-muted",
              t.enabled && !t.requires_approval && "border-green-300 bg-green-50 text-green-700",
              t.requires_approval && "border-amber-300 bg-amber-50 text-amber-700",
            )}
          >
            {t.requires_approval && <Shield className="size-2.5 shrink-0" />}
            {t.name}
          </button>
        ))}
      </div>
      {tool.tools.some((t) => t.requires_approval) && (
        <p className="mt-2 text-xs text-muted-foreground/70">
          <Shield className="mr-1 inline size-3 text-amber-600" />
          Amber tools pause the agent and wait for your approval before running.
        </p>
      )}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
      {children}
    </p>
  )
}

/** Quiet card that gives each form section the same rhythm as the dashboard cards. */
function SectionCard({
  title,
  children,
}: {
  title: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-gradient-to-t from-primary/[0.02] to-card p-5 shadow-xs">
      <SectionHeader>{title}</SectionHeader>
      {children}
    </section>
  )
}

function TriggerEditor({
  agentId,
  triggers,
  presets,
  channelConnectors,
  onChange,
}: {
  agentId: string
  triggers: Trigger[]
  presets: SchedulePreset[]
  channelConnectors: Connector[]
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the trigger")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {triggers.map((t) => {
        const Icon = t.type === "schedule" ? CalendarClock : t.type === "channel" ? MessageSquare : Play
        return (
        <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm">{TRIGGER_LABEL[t.type]}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {t.summary}
                {t.enabled && t.next_run_at && ` · next run ${untilNow(t.next_run_at)}`}
                {!t.enabled && " · paused"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              disabled={busy}
              onClick={() =>
                act(() =>
                  agents.updateTrigger(agentId, t.id, {
                    type: t.type,
                    config: t.config,
                    enabled: !t.enabled,
                  }),
                )
              }
            >
              {t.enabled ? "Pause" : "Resume"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
              disabled={busy}
              onClick={() => act(() => agents.deleteTrigger(agentId, t.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        )
      })}

      <div className="flex flex-wrap gap-2">
        <select
          defaultValue=""
          disabled={busy}
          onChange={(e) => {
            if (!e.target.value) return
            const preset = e.target.value
            e.target.value = ""
            act(() => agents.createTrigger(agentId, { type: "schedule", config: { preset } }))
          }}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none"
        >
          <option value="">Add a schedule…</option>
          {presets.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>

        {channelConnectors.length > 0 && (
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              if (!e.target.value) return
              const connectorId = e.target.value
              e.target.value = ""
              act(() => agents.createTrigger(agentId, { type: "channel", config: { connector_id: connectorId } }))
            }}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none"
          >
            <option value="">Listen for messages from…</option>
            {channelConnectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}


function SnapshotRow({
  snapshot: s,
  rollingBack,
  onRollback,
}: {
  snapshot: Snapshot
  rollingBack: boolean
  onRollback: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-3">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium">v{s.version}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(s.published_at).toLocaleString()}
          </span>
          {s.model && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {s.model}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {s.instructions_preview && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
              {open ? "Hide" : "Show"}
            </button>
          )}
          <button
            type="button"
            disabled={rollingBack}
            onClick={onRollback}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
              rollingBack ? "opacity-50" : "hover:bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <RotateCcw className={cn("size-3", rollingBack && "animate-spin")} />
            Restore
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t bg-muted/30 px-3 py-3">
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-sans">
            {s.instructions_preview}{s.instructions_preview.length >= 2000 ? "…" : ""}
          </pre>
        </div>
      )}
    </div>
  )
}
