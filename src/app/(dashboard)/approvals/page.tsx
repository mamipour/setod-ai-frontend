"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock, Shield, XCircle } from "lucide-react"
import { approvals, type ApprovalRequest } from "@/lib/api"
import { AgentIcon, timeAgo } from "@/components/agents/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useUser } from "@/hooks/useUser"
import { cn } from "@/lib/utils"

const POLL_MS = 15_000

export default function ApprovalsPage() {
  const { user } = useUser()
  const orgId = user?.organizations[0]?.id ?? ""

  const [pending, setPending] = useState<ApprovalRequest[] | null>(null)
  const [resolved, setResolved] = useState<ApprovalRequest[] | null>(null)
  const [showResolved, setShowResolved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!orgId) return
    try {
      const [p, r] = await Promise.all([
        approvals.list(orgId, false),
        showResolved ? approvals.list(orgId, true) : Promise.resolve(null),
      ])
      setPending(p)
      if (r !== null) setResolved(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load approvals")
    }
  }, [orgId, showResolved])

  useEffect(() => {
    reload()
    const t = setInterval(reload, POLL_MS)
    return () => clearInterval(t)
  }, [reload])

  const pendingCount = pending?.length ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review actions your agents want to take before they run.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>
      )}

      {/* Pending */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">
            Waiting for your decision
          </h2>
          {pendingCount > 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {pendingCount}
            </span>
          )}
        </div>

        {pending === null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-10 text-center">
            <Shield className="mx-auto mb-3 size-7 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nothing waiting</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Agents that have a tool marked with a shield will pause here before running it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <ApprovalCard key={r.id} request={r} onDecided={reload} />
            ))}
          </div>
        )}
      </section>

      {/* Resolved history */}
      <section className="space-y-3">
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setShowResolved((v) => !v)
            if (!showResolved) setResolved(null)
          }}
        >
          {showResolved ? "Hide resolved" : "Show resolved history"}
        </button>
        {showResolved && (
          resolved === null ? (
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
          ) : resolved.length === 0 ? (
            <p className="text-xs text-muted-foreground">No resolved requests yet.</p>
          ) : (
            <div className="space-y-2">
              {resolved.map((r) => (
                <ResolvedRow key={r.id} request={r} />
              ))}
            </div>
          )
        )}
      </section>
    </div>
  )
}

function ApprovalCard({
  request: r,
  onDecided,
}: {
  request: ApprovalRequest
  onDecided: () => void
}) {
  const [rejectMode, setRejectMode] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function decide(action: "approve" | "reject") {
    setBusy(true)
    setLocalError(null)
    try {
      if (action === "approve") {
        await approvals.approve(r.id, note)
      } else {
        await approvals.reject(r.id, note)
      }
      onDecided()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed")
      setBusy(false)
    }
  }

  const expiresIn = Math.max(
    0,
    Math.floor((new Date(r.expires_at).getTime() - Date.now()) / 3600_000),
  )

  return (
    <Card className="bg-gradient-to-t from-primary/[0.02] to-card shadow-xs border-amber-200/60">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <AgentIcon icon={r.agent_icon || "robot"} className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{r.agent_name || "Agent"}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            <Clock className="size-3" /> {expiresIn}h left
          </span>
        </div>

        {/* Summary */}
        <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground mb-1">About to</p>
          <p className="text-sm font-medium">{r.summary}</p>
        </div>

        {/* Args */}
        {Object.keys(r.tool_args).length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground">
              Show full arguments
            </summary>
            <pre className="mt-2 rounded-lg border bg-muted/40 p-2 text-[10px] font-mono leading-relaxed overflow-x-auto">
              {JSON.stringify(r.tool_args, null, 2)}
            </pre>
          </details>
        )}

        {/* Reject note input */}
        {rejectMode && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Reason for rejecting (optional)</p>
            <textarea
              ref={inputRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. Wrong recipient — check the instructions first."
              className="w-full rounded-lg border border-input bg-transparent p-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        )}

        {localError && (
          <p className="text-xs text-red-600">{localError}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/agents/${r.agent_id}?tab=Runs`}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            View run transcript
          </Link>
          <div className="flex items-center gap-2">
            {rejectMode ? (
              <>
                <Button size="sm" variant="ghost" className="text-xs" disabled={busy} onClick={() => setRejectMode(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" className="text-xs gap-1" disabled={busy} onClick={() => decide("reject")}>
                  <XCircle className="size-3.5" /> Reject
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20"
                  disabled={busy}
                  onClick={() => { setRejectMode(true); setTimeout(() => inputRef.current?.focus(), 50) }}
                >
                  Reject
                </Button>
                <Button size="sm" className="text-xs gap-1.5" disabled={busy} onClick={() => decide("approve")}>
                  <CheckCircle2 className="size-3.5" /> Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ResolvedRow({ request: r }: { request: ApprovalRequest }) {
  const icon =
    r.status === "approved"
      ? <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
      : r.status === "rejected"
      ? <XCircle className="size-3.5 text-red-500 shrink-0" />
      : <Clock className="size-3.5 text-muted-foreground shrink-0" />

  const label = r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Expired"

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-lg border px-3 py-2.5",
      r.status === "approved" && "border-green-100 bg-green-50/40",
      r.status !== "approved" && "border-muted bg-muted/20",
    )}>
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{r.summary}</p>
        <p className="text-[10px] text-muted-foreground">
          {r.agent_name} · {label}
          {r.resolved_at && ` · ${timeAgo(r.resolved_at)}`}
          {r.response_note && ` — ${r.response_note}`}
        </p>
      </div>
    </div>
  )
}
