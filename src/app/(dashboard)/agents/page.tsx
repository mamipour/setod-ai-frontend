"use client"

import { useMemo, useState } from "react"
import { Bot, Plus, Search, X } from "lucide-react"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { useAgents } from "@/hooks/useAgents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AgentCard } from "@/components/agents/AgentCard"
import { CreateAgentFlow } from "@/components/agents/CreateAgentFlow"
import { cn } from "@/lib/utils"

export default function AgentsPage() {
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""
  const { list, loading, error, refetch } = useAgents(orgId)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState("")

  const query = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!query) return list
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.instructions.toLowerCase().includes(query),
    )
  }, [list, query])

  const live   = filtered.filter((a) => a.status === "published")
  const paused = filtered.filter((a) => a.status === "paused")
  const drafts = filtered.filter((a) => a.status === "draft")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each agent does one job, using the accounts you have connected.
          </p>
        </div>
        <Button size="sm" className="text-xs shrink-0" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" /> New agent
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Search */}
      {!loading && list.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="h-8 pl-8 pr-8 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <AgentListSkeleton />
      ) : list.length === 0 ? (
        <EmptyNoAgents onCreate={() => setCreating(true)} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">No agents match "{search}"</p>
          <button onClick={() => setSearch("")} className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {live.length > 0 && (
            <Section title="Live" count={live.length} dot="bg-green-500">
              {live.map((a) => <AgentCard key={a.id} agent={a} />)}
            </Section>
          )}
          {paused.length > 0 && (
            <Section title="Paused" count={paused.length} dot="bg-amber-400">
              {paused.map((a) => <AgentCard key={a.id} agent={a} />)}
            </Section>
          )}
          {drafts.length > 0 && (
            <Section title="Drafts" count={drafts.length} dot="bg-muted-foreground/40">
              {drafts.map((a) => <AgentCard key={a.id} agent={a} />)}
            </Section>
          )}
        </div>
      )}

      {creating && (
        <CreateAgentFlow
          orgId={orgId}
          onClose={() => { setCreating(false); refetch() }}
        />
      )}
    </div>
  )
}

function EmptyNoAgents({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-12 text-center">
      <Bot className="mx-auto size-7 text-muted-foreground/40" />
      <p className="mt-3 text-sm font-medium">No agents yet</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Start from one of the ready-made agents — a missed call responder, an inbox triage —
        or write your own from scratch.
      </p>
      <Button size="sm" className="mt-4 text-xs" onClick={onCreate}>
        Create your first agent
      </Button>
    </div>
  )
}

function AgentListSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 rounded bg-muted animate-pulse" />
          <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-muted/70 animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-muted/70 animate-pulse" />
              </div>
              <div className="h-3 w-20 rounded bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  dot,
  children,
}: {
  title: string
  count: number
  dot: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full shrink-0", dot)} />
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}
