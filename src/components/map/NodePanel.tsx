"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, Plug } from "lucide-react"
import { AgentIcon, connectorIconSrc, timeAgo } from "@/components/agents/shared"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { AGENT_STATUS_DOT, AGENT_STATUS_LABEL } from "./nodes"
import type { FlowNode } from "./types"

/** Right-hand drawer with the full facts for the clicked node, plus a deep link to edit it. */
export function NodePanel({
  node,
  windowHours,
  onClose,
}: {
  node: FlowNode | null
  windowHours: number
  onClose: () => void
}) {
  return (
    <Sheet open={node !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="overflow-y-auto">
        {node?.type === "agent" && <AgentDetails node={node} windowHours={windowHours} />}
        {node?.type === "connector" && <ConnectorDetails node={node} />}
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-1 text-sm text-muted-foreground">{children}</p>
}

function AgentDetails({ node, windowHours }: { node: Extract<FlowNode, { type: "agent" }>; windowHours: number }) {
  const d = node.data
  const status = d.status ?? "draft"
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <AgentIcon icon={d.icon ?? "robot"} className="size-5" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="truncate">{d.name}</SheetTitle>
            <SheetDescription className="flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", AGENT_STATUS_DOT[status] ?? "bg-gray-400")} />
              {AGENT_STATUS_LABEL[status] ?? status}
              {d.running && <span className="text-green-600 dark:text-green-400"> · running now</span>}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <Section title="Runs">
        <div className="divide-y">
          <Row label="Model">{d.model ?? "—"}</Row>
          <Row label="Schedule">
            {[d.schedule, d.onMessage ? "on incoming message" : null].filter(Boolean).join(" + ") || "manual only"}
          </Row>
          <Row label="Last run">
            {d.last_run_at ? `${timeAgo(d.last_run_at)}${d.last_run_status ? ` · ${d.last_run_status}` : ""}` : "never"}
          </Row>
          <Row label={`Runs, last ${windowHours}h`}>{d.runs_24h}</Row>
        </div>
      </Section>

      <Section title="Connectors">
        {d.connectorNames.length ? (
          <ul className="space-y-1 py-1 text-sm">
            {d.connectorNames.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : (
          <Empty>No connectors wired. This agent only has the model and built-in tools.</Empty>
        )}
      </Section>

      <Section title="Calls">
        {d.calls.length ? (
          <ul className="space-y-1.5 py-1 text-sm">
            {d.calls.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span>
                {c.description && <span className="block text-xs text-muted-foreground">{c.description}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Does not call other agents.</Empty>
        )}
      </Section>

      <Section title="Called by">
        {d.calledBy.length ? (
          <ul className="space-y-1 py-1 text-sm">
            {d.calledBy.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        ) : (
          <Empty>Not called by other agents.</Empty>
        )}
      </Section>

      <div className="mt-auto px-4 pb-4">
        <Button size="sm" className="w-full" nativeButton={false} render={<Link href={`/agents/${d.id}`} />}>
          Open agent <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
    </>
  )
}

function ConnectorDetails({ node }: { node: Extract<FlowNode, { type: "connector" }> }) {
  const d = node.data
  const src = d.type ? connectorIconSrc(d.type, d.name) : undefined
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {src ? <Image src={src} alt="" width={22} height={22} /> : <Plug className="size-5 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <SheetTitle className="truncate">{d.name}</SheetTitle>
            <SheetDescription>
              {d.type?.replaceAll("_", " ")} · {d.status ?? "unknown"}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <Section title="Used by">
        {d.usedBy.length ? (
          <ul className="space-y-1 py-1 text-sm">
            {d.usedBy.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : (
          <Empty>No agent uses this connector yet.</Empty>
        )}
      </Section>

      <Section title="Triggers">
        {d.triggers.length ? (
          <ul className="space-y-1 py-1 text-sm">
            {d.triggers.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : (
          <Empty>Does not wake any agent on incoming messages.</Empty>
        )}
      </Section>

      <div className="mt-auto px-4 pb-4">
        <Button size="sm" variant="outline" className="w-full" nativeButton={false} render={<Link href="/connectors" />}>
          Manage connectors <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
    </>
  )
}
