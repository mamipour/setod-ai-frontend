"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronRight, History, RefreshCw } from "lucide-react"
import { agents, type Session, type SessionDetail, type SessionStatus, type TriggerType } from "@/lib/api"
import { MessageRow } from "@/components/agents/CreateAgentFlow"
import {
  SessionStatusBadge,
  TRIGGER_LABEL,
  approxCost,
  duration,
  timeAgo,
} from "@/components/agents/shared"
import { cn } from "@/lib/utils"

// Only while something is running. Polling a page of finished runs forever is wasted work on
// both ends, and the list does not change when nothing is happening.
const POLL_MS = 4000

type StatusFilter = SessionStatus | "all"
type TriggerFilter = TriggerType | "all"

export function SessionsTab({ agentId }: { agentId: string }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState<StatusFilter>("all")
  const [trigger, setTrigger] = useState<TriggerFilter>("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const cancelRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const rows = await agents.listSessions(agentId)
      if (cancelRef.current) return
      setSessions(rows)
      if (rows.some((s) => s.status === "running" || s.status === "waiting_approval")) {
        timerRef.current = setTimeout(() => load(), POLL_MS)
      }
    } finally {
      if (!cancelRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [agentId])

  useEffect(() => {
    cancelRef.current = false
    load()
    return () => {
      cancelRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [load])

  const visible = sessions.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (trigger === "all" || s.trigger_type === trigger),
  )

  if (loading) return <SessionsSkeleton />

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-12 text-center">
        <History className="mx-auto size-6 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">Nothing has run yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Every run shows up here with the full step-by-step of what the agent did.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <PillGroup
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            ["all", "All"],
            ["succeeded", "Succeeded"],
            ["error", "Failed"],
            ["running", "Running"],
          ]}
        />
        <PillGroup
          value={trigger}
          onChange={(v) => setTrigger(v as TriggerFilter)}
          options={[
            ["all", "Any trigger"],
            ["schedule", "Scheduled"],
            ["manual", "Manual"],
          ]}
        />
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          title="Refresh runs"
          className="ml-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-2">
        {visible.map((s) => (
          <SessionRow
            key={s.id}
            agentId={agentId}
            session={s}
            open={expanded === s.id}
            onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
          />
        ))}
        {visible.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No runs match these filters.
          </p>
        )}
      </div>
    </div>
  )
}

function PillGroup({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <div className="flex gap-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            value === v
              ? "border-primary/40 bg-primary/5 font-medium text-primary"
              : "border-transparent text-muted-foreground hover:bg-muted",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SessionsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border px-3 py-3">
          <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
            <div className="h-2.5 w-56 rounded bg-muted/70 animate-pulse" />
          </div>
          <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function SessionRow({
  agentId,
  session,
  open,
  onToggle,
}: {
  agentId: string
  session: Session
  open: boolean
  onToggle: () => void
}) {
  const [detail, setDetail] = useState<SessionDetail | null>(null)

  useEffect(() => {
    if (open && !detail) {
      agents.getSession(agentId, session.id).then(setDetail)
    }
  }, [open, detail, agentId, session.id])

  return (
    <div className="rounded-xl border">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{session.name || "Untitled run"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {TRIGGER_LABEL[session.trigger_type]}
            {session.triggered_by_agent_name && ` · called by ${session.triggered_by_agent_name}`} · {timeAgo(session.started_at)} ·{" "}
            {duration(session.started_at, session.finished_at)} · {approxCost(session.total_tokens)}
          </p>
        </div>
        <SessionStatusBadge status={session.status} dryRun={session.dry_run} />
      </button>

      {open && (
        <div className="border-t px-3 py-3">
          {session.error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
              {session.error}
            </p>
          )}
          {detail === null ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-2">
              {detail.messages.map((m) => (
                <MessageRow key={m.id} role={m.role} toolName={m.tool_name} content={m.content} />
              ))}
              <p className={cn("pt-2 text-xs text-muted-foreground/60")}>
                {detail.iterations} step{detail.iterations === 1 ? "" : "s"} ·{" "}
                {detail.total_tokens.toLocaleString()} tokens
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
