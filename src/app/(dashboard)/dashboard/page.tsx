"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Plug, TrendingDown, TrendingUp } from "lucide-react"
import { agents, approvals as approvalsApi, type Agent, type DailyRuns, type Overview } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  AgentIcon,
  SessionStatusBadge,
  approxCost,
  duration,
  timeAgo,
} from "@/components/agents/shared"
import { cn } from "@/lib/utils"

// ── Greeting ──────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

// ── Stat cards ────────────────────────────────────────────────────────────────

interface Trend { pct: number | null; up: boolean; bad: boolean }

function diff(today: number, yesterday: number, badWhenUp = false): Trend | undefined {
  if (today === yesterday) return undefined
  const pct = yesterday === 0 ? null : Math.round(((today - yesterday) / yesterday) * 100)
  return { pct, up: today > yesterday, bad: badWhenUp }
}

function StatCard({ label, value, foot, trend, alarm }: {
  label: string; value: string; foot?: string; trend?: Trend; alarm?: boolean
}) {
  const TrendIcon = trend?.up ? TrendingUp : TrendingDown
  const trendGood = trend ? trend.up !== trend.bad : true
  return (
    <Card className={cn("bg-gradient-to-t from-primary/[0.03] to-card shadow-xs", alarm && "border-red-200 from-red-500/[0.04]")}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {trend && (
            <span className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
              trendGood ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700",
            )}>
              <TrendIcon className="size-3" />
              {trend.pct === null ? "new" : `${trend.pct > 0 ? "+" : ""}${trend.pct}%`}
            </span>
          )}
        </div>
        <p className={cn("mt-1.5 text-2xl font-bold tabular-nums", alarm && "text-red-600")}>{value}</p>
        {foot && <p className="mt-0.5 truncate text-xs text-muted-foreground/60">{foot}</p>}
      </CardContent>
    </Card>
  )
}

// ── Pending approvals banner ───────────────────────────────────────────────────

function ApprovalsBanner({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <Link href="/approvals">
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <CheckCircle2 className="size-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {count} approval{count > 1 ? "s" : ""} waiting for your review
          </p>
          <p className="text-xs text-amber-700">Agents are paused until you approve or reject.</p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-amber-500" />
      </div>
    </Link>
  )
}

// ── Failing agents callout ────────────────────────────────────────────────────

function FailingAgentsCallout({ sessions }: { sessions: Overview["recent_sessions"] }) {
  // Unique agents that have errored recently
  const seen = new Set<string>()
  const failing = sessions.filter((s) => {
    if (s.status !== "error" || seen.has(s.agent_id)) return false
    seen.add(s.agent_id)
    return true
  })
  if (failing.length === 0) return null

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-red-500 shrink-0" />
        <p className="text-sm font-semibold text-red-900">
          {failing.length} agent{failing.length > 1 ? "s" : ""} need attention
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {failing.map((s) => (
          <Link key={s.agent_id} href={`/agents/${s.agent_id}`}>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors">
              <AgentIcon icon={s.agent_icon} className="size-3.5" />
              {s.agent_name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Agent health mini-grid ────────────────────────────────────────────────────

function HealthDot({ score }: { score: number | null }) {
  if (score === null) return <span className="size-2 rounded-full bg-muted inline-block" title="No runs yet" />
  if (score >= 0.8)   return <span className="size-2 rounded-full bg-green-500 inline-block" title={`${Math.round(score * 100)}% success`} />
  if (score >= 0.5)   return <span className="size-2 rounded-full bg-yellow-400 inline-block" title={`${Math.round(score * 100)}% success`} />
  return               <span className="size-2 rounded-full bg-red-500 inline-block" title={`${Math.round(score * 100)}% success`} />
}

function AgentHealthGrid({ agentList }: { agentList: Agent[] }) {
  const live = agentList.filter((a) => a.status === "published")
  if (live.length === 0) return null

  return (
    <Card className="bg-gradient-to-t from-primary/[0.03] to-card shadow-xs">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">Agent health</p>
          <Link href="/agents" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            All agents <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {live.map((a) => (
            <Link key={a.id} href={`/agents/${a.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors group">
              <HealthDot score={a.health_score} />
              <AgentIcon icon={a.icon} className="size-4 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">{a.name}</span>
              {a.health_score !== null && (
                <span className={cn(
                  "text-xs tabular-nums shrink-0",
                  a.health_score >= 0.8 ? "text-green-600" : a.health_score >= 0.5 ? "text-yellow-600" : "text-red-600"
                )}>
                  {Math.round(a.health_score * 100)}%
                </span>
              )}
              {a.health_score === null && (
                <span className="text-xs text-muted-foreground/50 shrink-0">no runs</span>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── 7-day activity chart ──────────────────────────────────────────────────────

function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })
}

function ActivityChart({ days }: { days: DailyRuns[] }) {
  const max = Math.max(...days.map((d) => d.runs), 1)
  const total = days.reduce((sum, d) => sum + d.runs, 0)
  if (total === 0) return null

  return (
    <Card className="bg-gradient-to-t from-primary/[0.03] to-card shadow-xs">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium text-muted-foreground">Runs, last 7 days</p>
          <p className="text-xs tabular-nums text-muted-foreground/60">{total} total</p>
        </div>
        <div className="mt-4 flex h-24 items-end gap-2">
          {days.map((d) => {
            const ok = d.runs - d.failures
            return (
              <div key={d.date} className="group relative flex flex-1 flex-col justify-end gap-px">
                <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border bg-card px-2 py-1 text-[10px] opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  <span className="font-semibold tabular-nums">{d.runs}</span> run{d.runs === 1 ? "" : "s"}
                  {d.failures > 0 && <span className="text-red-600"> · {d.failures} failed</span>}
                </div>
                {d.failures > 0 && (
                  <div className="w-full rounded-t-sm bg-red-400/80" style={{ height: `${(d.failures / max) * 100}%`, minHeight: 3 }} />
                )}
                {ok > 0 && (
                  <div className={cn("w-full bg-primary/70 transition-colors group-hover:bg-primary", d.failures === 0 && "rounded-t-sm")}
                    style={{ height: `${(ok / max) * 100}%`, minHeight: 3 }} />
                )}
                {d.runs === 0 && <div className="h-[3px] w-full rounded-sm bg-muted" />}
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex gap-2">
          {days.map((d) => (
            <p key={d.date} className="flex-1 text-center text-[10px] text-muted-foreground/60">{weekday(d.date)}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Contextual quick links ────────────────────────────────────────────────────

function ContextualLinks({ agentList, overview }: { agentList: Agent[]; overview: Overview }) {
  const hints: { href: string; icon: React.ReactNode; title: string; text: string }[] = []

  // Agents that haven't run in 7 days
  const staleCount = agentList.filter((a) => {
    if (a.status !== "published") return false
    const updated = new Date(a.updated_at).getTime()
    return Date.now() - updated > 7 * 24 * 60 * 60 * 1000
  }).length

  if (staleCount > 0) {
    hints.push({
      href: "/agents",
      icon: <Bot className="size-4" />,
      title: `${staleCount} agent${staleCount > 1 ? "s" : ""} haven't run in 7 days`,
      text: "Check their schedules or trigger a manual run.",
    })
  }

  if (agentList.length === 0) {
    hints.push({
      href: "/agents",
      icon: <Bot className="size-4" />,
      title: "Create your first agent",
      text: "Start from a template or write your own from scratch.",
    })
  }

  if (overview.agents_total > 0 && overview.runs_today === 0) {
    hints.push({
      href: "/agents",
      icon: <Bot className="size-4" />,
      title: "No runs today yet",
      text: "Trigger a manual run or check your agent schedules.",
    })
  }

  // Always add connectors nudge if no hints yet
  if (hints.length === 0) {
    hints.push({
      href: "/connectors",
      icon: <Plug className="size-4" />,
      title: "Add more connectors",
      text: "Connect new accounts — every agent in the workspace can use them.",
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {hints.slice(0, 2).map((h) => (
        <Link key={h.href + h.title} href={h.href} className="block group">
          <Card className="h-full transition-colors group-hover:bg-muted/40">
            <CardContent className="flex items-start gap-3 pt-5 pb-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {h.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{h.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{h.text}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyNoAgents() {
  return (
    <div className="rounded-xl border border-dashed px-6 py-12 text-center">
      <Bot className="mx-auto size-7 text-muted-foreground/40" />
      <p className="mt-3 text-sm font-medium">No agents yet</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Start from a ready-made agent — a missed call responder, an inbox triage — or write your own.
      </p>
      <Link href="/agents">
        <Button size="sm" className="mt-4 text-xs">Create your first agent</Button>
      </Link>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="pt-5 pb-4"><Skeleton className="mb-3 h-3 w-20" /><Skeleton className="h-7 w-12" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="pt-5 pb-4"><Skeleton className="mb-4 h-3 w-28" /><Skeleton className="h-24 w-full" /></CardContent></Card>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="divide-y rounded-xl border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-8 rounded-lg" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-2.5 w-52" /></div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser()
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""

  const [overview, setOverview]       = useState<Overview | null>(null)
  const [agentList, setAgentList]     = useState<Agent[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    Promise.all([
      agents.overview(orgId),
      agents.list(orgId),
      approvalsApi.count(orgId),
    ])
      .then(([ov, al, { count }]) => {
        setOverview(ov)
        setAgentList(al)
        setPendingCount(count)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the dashboard"))
  }, [orgId])

  if (userLoading || (!overview && !error)) return <DashboardSkeleton />

  return (
    <div className="space-y-6">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">{greeting()}, {user?.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what your agents have been doing.</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {overview && (
        <>
          {/* 1. Pending approvals — first thing to see */}
          <ApprovalsBanner count={pendingCount} />

          {/* 2. Failing agents callout */}
          <FailingAgentsCallout sessions={overview.recent_sessions} />

          {/* 3. Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Live agents"
              value={String(overview.agents_live)}
              foot={overview.agents_total > overview.agents_live
                ? `${overview.agents_total - overview.agents_live} more in draft`
                : "All agents are live"}
            />
            <StatCard
              label="Runs today"
              value={String(overview.runs_today)}
              trend={diff(overview.runs_today, overview.runs_yesterday)}
              foot={`${overview.runs_yesterday} yesterday`}
            />
            <StatCard
              label="Failures today"
              value={String(overview.failures_today)}
              alarm={overview.failures_today > 0}
              trend={diff(overview.failures_today, overview.failures_yesterday, true)}
              foot={overview.failures_today === 0 ? "Everything is healthy" : `${overview.failures_yesterday} yesterday`}
            />
            <StatCard
              label="Spend today"
              value={approxCost(overview.tokens_today)}
              trend={diff(overview.tokens_today, overview.tokens_yesterday)}
              foot={`${overview.tokens_today.toLocaleString()} tokens`}
            />
          </div>

          {/* 4. Agent health grid + 7-day chart — side by side on wide screens */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AgentHealthGrid agentList={agentList} />
            <ActivityChart days={overview.daily_runs} />
          </div>

          {/* 5. Recent activity */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent activity</h2>
              {overview.recent_sessions.length > 0 && (
                <Link href="/agents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  All agents <ArrowRight className="size-3" />
                </Link>
              )}
            </div>

            {overview.agents_total === 0 ? (
              <EmptyNoAgents />
            ) : overview.recent_sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-10 text-center">
                <p className="text-sm font-medium">Nothing has run yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Runs appear here as they happen — scheduled or started by hand.</p>
              </div>
            ) : (
              <div className="divide-y rounded-xl border">
                {overview.recent_sessions.map((s) => (
                  <Link key={s.id} href={`/agents/${s.agent_id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/40">
                    <span className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      s.status === "error" ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground",
                    )}>
                      <AgentIcon icon={s.agent_icon} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.agent_name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {timeAgo(s.started_at)} · {duration(s.started_at, s.finished_at)} · {approxCost(s.total_tokens)}
                      </p>
                    </div>
                    <SessionStatusBadge status={s.status} dryRun={s.dry_run} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 6. Contextual quick links */}
          <ContextualLinks agentList={agentList} overview={overview} />
        </>
      )}
    </div>
  )
}
