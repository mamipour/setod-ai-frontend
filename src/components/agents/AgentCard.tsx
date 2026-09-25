"use client"

import Image from "next/image"
import Link from "next/link"
import { CalendarClock, Hand, MessageSquare, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Agent, TriggerType } from "@/lib/api"
import { AgentIcon, AgentStatusBadge, connectorIconSrc, timeAgo } from "@/components/agents/shared"
import { cn } from "@/lib/utils"

function HealthPill({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs text-muted-foreground/50">No runs yet</span>
  }
  const pct = Math.round(score * 100)
  const { dot, text } =
    score >= 0.8
      ? { dot: "bg-green-500", text: "text-green-700" }
      : score >= 0.5
        ? { dot: "bg-yellow-400", text: "text-yellow-700" }
        : { dot: "bg-red-500",   text: "text-red-700" }
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium tabular-nums", text)}>
      <span className={cn("size-1.5 rounded-full shrink-0", dot)} />
      {pct}% success
    </span>
  )
}

/**
 * Pull the first sentence/phrase that actually describes the job — not a "You are…" preamble
 * that the user never wrote themselves and doesn't need to read on every card.
 */
function extractSummary(instructions: string): string {
  const lines = instructions
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  for (const line of lines) {
    if (/^You are\b/i.test(line)) continue
    if (line.startsWith("#")) continue
    if (line.length < 20) continue
    return line.replace(/^[-–—*]\s*/, "")
  }

  return lines[0] ?? "No instructions yet."
}

const TRIGGER_ICON: Record<TriggerType, React.ElementType> = {
  schedule: CalendarClock,
  channel:  MessageSquare,
  manual:   Hand,
  agent:    Zap,
}

const TRIGGER_LABEL: Record<TriggerType, string> = {
  schedule: "Scheduled",
  channel:  "On message",
  manual:   "Manual",
  agent:    "By another agent",
}

function TriggerChip({ type }: { type: TriggerType }) {
  const Icon = TRIGGER_ICON[type]
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground">
      <Icon className="size-2.5 shrink-0" />
      {TRIGGER_LABEL[type]}
    </span>
  )
}

function MiniConnectors({ types }: { types: string[] }) {
  if (types.length === 0) return null
  return (
    <span className="inline-flex items-center gap-0.5">
      {types.map((type) => {
        const src = connectorIconSrc(type as Parameters<typeof connectorIconSrc>[0])
        if (!src) return null
        return (
          <span
            key={type}
            title={type}
            className="flex size-5 items-center justify-center rounded border bg-white dark:ring-1 dark:ring-white/10"
          >
            <Image src={src} alt="" width={12} height={12} />
          </span>
        )
      })}
    </span>
  )
}

export function AgentCard({ agent }: { agent: Agent }) {
  const summary = extractSummary(agent.instructions)
  const runLabel = agent.last_run_at ? `Last run ${timeAgo(agent.last_run_at)}` : null

  return (
    <Link href={`/agents/${agent.id}`} className="block group">
      <Card className="h-full bg-gradient-to-t from-primary/[0.03] to-card shadow-xs transition-all group-hover:shadow-sm group-hover:from-primary/[0.06]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  agent.status === "published"
                    ? "bg-green-50 text-green-700"
                    : agent.status === "paused"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <AgentIcon icon={agent.icon} className="size-4" />
              </div>
              <CardTitle className="truncate text-sm font-semibold">{agent.name}</CardTitle>
            </div>
            <AgentStatusBadge status={agent.status} hasChanges={agent.has_unpublished_changes} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{summary}</p>

          {/* Identity strip: trigger chip + connector icons */}
          {(agent.primary_trigger_type || agent.connector_types.length > 0) && (
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              {agent.primary_trigger_type && <TriggerChip type={agent.primary_trigger_type} />}
              <MiniConnectors types={agent.connector_types} />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground/50 truncate">
              {runLabel ?? "Never run"}
            </p>
            <HealthPill score={agent.health_score} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
