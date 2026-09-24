"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, History, Loader2, MoreVertical, Play, Settings2, Sparkles, SlidersHorizontal, Trash2 } from "lucide-react"
import { agents, type SessionDetail } from "@/lib/api"
import { useAgent } from "@/hooks/useAgents"
import { useUser } from "@/hooks/useUser"
import { Button } from "@/components/ui/button"
import { AgentTab } from "@/components/agents/AgentTab"
import { AssistantTab } from "@/components/agents/AssistantTab"
import { KnowledgeTab } from "@/components/agents/KnowledgeTab"
import { MessageRow } from "@/components/agents/CreateAgentFlow"
import { SessionsTab } from "@/components/agents/SessionsTab"
import { SettingsTab } from "@/components/agents/SettingsTab"
import {
  AgentStatusBadge,
  IconPicker,
  Modal,
  SessionStatusBadge,
  duration,
} from "@/components/agents/shared"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "Agent",     label: "Agent",     Icon: SlidersHorizontal },
  { id: "Knowledge", label: "Knowledge", Icon: BookOpen          },
  { id: "Runs",      label: "Runs",      Icon: History           },
  { id: "Copilot",   label: "Copilot",   Icon: Sparkles          },
  { id: "Settings",  label: "Settings",  Icon: Settings2         },
] as const
type Tab = (typeof TABS)[number]["id"]

function AgentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-20 rounded bg-muted animate-pulse" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-muted animate-pulse" />
            <div className="h-5 w-12 rounded-full bg-muted/70 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
          <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex gap-1 border-b pb-px">
        {["Agent", "Runs", "Settings"].map((t) => (
          <div key={t} className="h-9 w-16 rounded-t bg-muted/50 animate-pulse mx-1" />
        ))}
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-10 rounded bg-muted/70 animate-pulse" />
          <div className="h-9 w-full rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-muted/70 animate-pulse" />
          <div className="h-48 w-full rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const orgId = user?.organizations[0]?.id ?? ""
  const { agent, loading, error, patch, refetch } = useAgent(id)

  const [tab, setTab] = useState<Tab>("Agent")
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<SessionDetail | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (userLoading || loading) return <AgentDetailSkeleton />
  if (error || !agent) return <p className="text-sm text-red-600">{error ?? "Agent not found"}</p>

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      refetch()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function runPreview() {
    setPreviewing(true)
    setPreview(null)
    setActionError(null)
    try {
      // A real run against the draft: actions are performed, not simulated.
      const s = await agents.run(id, orgId, { use_draft: true })
      setPreview(await agents.getSession(id, s.id))
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "The run could not start")
      setPreviewing(false)
    }
  }

  async function remove() {
    if (!confirm(`Delete "${agent!.name}"? This cannot be undone.`)) return
    await agents.delete(id)
    router.push("/agents")
  }

  return (
    <div className="space-y-6">
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All agents
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <IconPicker
            icon={agent.icon}
            className={
              agent.status === "published"
                ? "bg-green-50 text-green-700"
                : agent.status === "paused"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-muted text-muted-foreground"
            }
            onPick={async (icon) => {
              const updated = await agents.update(id, { icon })
              patch({ icon: updated.icon, has_unpublished_changes: updated.has_unpublished_changes })
            }}
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{agent.name}</h1>
            <div className="mt-1.5">
              <AgentStatusBadge
                status={agent.status}
                hasChanges={agent.has_unpublished_changes}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={runPreview}
            disabled={previewing}
          >
            {previewing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Test run
          </Button>

          {agent.status === "published" ? (
            <>
              {agent.has_unpublished_changes && (
                <Button
                  disabled={busy}
                  onClick={() => act(() => agents.publish(id))}
                  className="text-xs"
                >
                  Publish changes
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={busy}
                onClick={() => act(() => agents.pause(id))}
              >
                Pause
              </Button>
            </>
          ) : agent.status === "paused" ? (
            <>
              <Button
                disabled={busy}
                onClick={() => act(() => agents.resume(id))}
                className="text-xs"
              >
                Resume
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-muted-foreground"
                disabled={busy}
                onClick={() => act(() => agents.unpublish(id))}
              >
                Unpublish
              </Button>
            </>
          ) : (
            <Button
              disabled={busy}
              onClick={() => act(() => agents.publish(id))}
              className="text-xs"
            >
              Go live
            </Button>
          )}

          <OverflowMenu onDelete={remove} />
        </div>
      </div>

      {actionError && <p className="text-xs text-red-600">{actionError}</p>}

      <div className="flex gap-1 border-b">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              tab === id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "Agent" && <AgentTab agent={agent} orgId={orgId} onPatch={patch} />}
      {tab === "Knowledge" && <KnowledgeTab agentId={id} />}
      {tab === "Runs" && <SessionsTab agentId={id} />}
      {tab === "Copilot" && (
        <AssistantTab
          agent={agent}
          orgId={orgId}
        />
      )}
      {tab === "Settings" && <SettingsTab agent={agent} onPatch={patch} />}

      <Modal
        open={previewing}
        onClose={() => {
          setPreviewing(false)
          setPreview(null)
        }}
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Test run</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Running your unpublished draft for real  -  messages are actually sent and your
              accounts are actually used.
            </p>
          </div>

          {preview === null ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Working…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <SessionStatusBadge status={preview.status} dryRun={preview.dry_run} />
                <span className="text-xs text-muted-foreground">
                  {duration(preview.started_at, preview.finished_at)} ·{" "}
                  {preview.total_tokens.toLocaleString()} tokens
                </span>
              </div>
              {preview.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {preview.error}
                </p>
              )}
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border p-3">
                {preview.messages.map((m) => (
                  <MessageRow
                    key={m.id}
                    role={m.role}
                    toolName={m.tool_name}
                    content={m.content}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end border-t pt-3">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setPreviewing(false)
                setPreview(null)
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/** Rare, destructive actions live behind a ⋯ so they can't be clicked by accident. */
function OverflowMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border bg-card py-1 shadow-lg">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/5"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            <Trash2 className="size-3.5" /> Delete agent
          </button>
        </div>
      )}
    </div>
  )
}
