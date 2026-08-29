"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Bot, Plug, TrendingDown, TrendingUp } from "lucide-react"
import { agents, type DailyRuns, type Overview } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
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

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser()
  const orgId = user?.organizations[0]?.id ?? ""
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    agents
      .overview(orgId)
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the dashboard"))
  }, [orgId])

  if (userLoading || (!overview && !error)) return <DashboardSkeleton />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Good to see you, {user?.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what your agents have been doing.
        </p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {overview && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Live agents"
              value={String(overview.agents_live)}
              foot={
                overview.agents_total > overview.agents_live
                  ? `${overview.agents_total - overview.agents_live} more in draft`
                  : "All agents are live"
              }
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
              foot={
                overview.failures_today === 0
                  ? "Everything is healthy"
                  : `${overview.failures_yesterday} yesterday`
              }
            />
            <StatCard
              label="Spend today"
              value={approxCost(overview.tokens_today)}
              trend={diff(overview.tokens_today, overview.tokens_yesterday)}
              foot={`${overview.tokens_today.toLocaleString()} tokens`}
            />
          </div>

          {/* 7-day activity */}
          <ActivityChart days={overview.daily_runs} />

          {/* Recent activity */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent activity</h2>
              {overview.recent_sessions.length > 0 && (
                <Link
                  href="/agents"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  All agents <ArrowRight className="size-3" />
                </Link>
              )}
            </div>

            {overview.agents_total === 0 ? (
              <EmptyNoAgents />
            ) : overview.recent_sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-10 text-center">
                <p className="text-sm font-medium">Nothing has run yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Runs appear here as they happen  -  scheduled or started by hand.
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-xl border">
                {overview.recent_sessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/agents/${s.agent_id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        s.status === "error"
                          ? "bg-red-50 text-red-600"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <AgentIcon icon={s.agent_icon} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.agent_name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {timeAgo(s.started_at)} · {duration(s.started_at, s.finished_at)} ·{" "}
                        {approxCost(s.total_tokens)}
                      </p>
                    </div>
                    <SessionStatusBadge status={s.status} dryRun={s.dry_run} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quick links */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <QuickLink
              href="/agents"
              icon={<Bot className="size-4" />}
              title="Agents"
              text="Create a new agent or edit what the existing ones do."
            />
            <QuickLink
              href="/connectors"
              icon={<Plug className="size-4" />}
              title="Connectors"
              text="Connect accounts once  -  every agent can use them."
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── Stat cards ──────────────────────────────────────────────────────────────────

interface Trend {
  pct: number | null // null when yesterday was 0  -  no meaningful percentage
  up: boolean
  bad: boolean // whether "up" is a bad thing (failures)
}

function diff(today: number, yesterday: number, badWhenUp = false): Trend | undefined {
  if (today === yesterday) return undefined
  const pct = yesterday === 0 ? null : Math.round(((today - yesterday) / yesterday) * 100)
  return { pct, up: today > yesterday, bad: badWhenUp }
}

function StatCard({
  label,
  value,
  foot,
  trend,
  alarm,
}: {
  label: string
  value: string
  foot?: string
  trend?: Trend
  alarm?: boolean
}) {
  const TrendIcon = trend?.up ? TrendingUp : TrendingDown
  // Up is green unless it's a "bad up" metric (failures); down is the reverse.
  const trendGood = trend ? trend.up !== trend.bad : true

  return (
    <Card
      className={cn(
        "bg-gradient-to-t from-primary/[0.03] to-card shadow-xs",
        alarm && "border-red-200 from-red-500/[0.04]",
      )}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {trend && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                trendGood
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700",
              )}
            >
              <TrendIcon className="size-3" />
              {trend.pct === null ? "new" : `${trend.pct > 0 ? "+" : ""}${trend.pct}%`}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-1.5 text-2xl font-bold tabular-nums",
            alarm && "text-red-600",
          )}
        >
          {value}
        </p>
        {foot && <p className="mt-0.5 truncate text-xs text-muted-foreground/60">{foot}</p>}
      </CardContent>
    </Card>
  )
}

// ── 7-day activity chart ────────────────────────────────────────────────────────

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
                {/* Tooltip */}
                <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border bg-card px-2 py-1 text-[10px] opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  <span className="font-semibold tabular-nums">{d.runs}</span> run
                  {d.runs === 1 ? "" : "s"}
                  {d.failures > 0 && (
                    <span className="text-red-600"> · {d.failures} failed</span>
                  )}
                </div>
                {d.failures > 0 && (
                  <div
                    className="w-full rounded-t-sm bg-red-400/80"
                    style={{ height: `${(d.failures / max) * 100}%`, minHeight: 3 }}
                  />
                )}
                {ok > 0 && (
                  <div
                    className={cn(
                      "w-full bg-primary/70 transition-colors group-hover:bg-primary",
                      d.failures === 0 && "rounded-t-sm",
                    )}
                    style={{ height: `${(ok / max) * 100}%`, minHeight: 3 }}
                  />
                )}
                {d.runs === 0 && <div className="h-[3px] w-full rounded-sm bg-muted" />}
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex gap-2">
          {days.map((d) => (
            <p key={d.date} className="flex-1 text-center text-[10px] text-muted-foreground/60">
              {weekday(d.date)}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })
}

// ── Quick links / empty states / skeleton ───────────────────────────────────────

function QuickLink({
  href,
  icon,
  title,
  text,
}: {
  href: string
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <Link href={href} className="block group">
      <Card className="h-full transition-colors group-hover:bg-muted/40">
        <CardContent className="flex items-start gap-3 pt-5 pb-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyNoAgents() {
  return (
    <div className="rounded-xl border border-dashed px-6 py-12 text-center">
      <Bot className="mx-auto size-7 text-muted-foreground/40" />
      <p className="mt-3 text-sm font-medium">No agents yet</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Start from a ready-made agent  -  a missed call responder, an inbox triage  -  or write
        your own from scratch.
      </p>
      <Link href="/agents">
        <Button size="sm" className="mt-4 text-xs">
          Create your first agent
        </Button>
      </Link>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              <Skeleton className="mb-3 h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-5 pb-4">
          <Skeleton className="mb-4 h-3 w-28" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="divide-y rounded-xl border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-2.5 w-52" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
