"use client"

import { memo } from "react"
import Image from "next/image"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Plug } from "lucide-react"
import { AgentIcon, connectorIconSrc, timeAgo } from "@/components/agents/shared"
import { cn } from "@/lib/utils"
import type { AgentFlowNode, ConnectorFlowNode } from "./types"

// Handles are invisible: the edges alone convey direction, and nothing here is editable.
const handleClass = "!size-2 !border-0 !bg-transparent !min-w-0 !min-h-0"

export const AGENT_STATUS_DOT: Record<string, string> = {
  published: "bg-green-500",
  paused: "bg-amber-500",
  draft: "bg-gray-400",
}

export const AGENT_STATUS_LABEL: Record<string, string> = {
  published: "Live",
  paused: "Paused",
  draft: "Draft",
}

const RUN_STATUS_LABEL: Record<string, string> = {
  succeeded: "ok",
  error: "failed",
  running: "running",
  waiting_approval: "waiting approval",
}

const CONNECTOR_STATUS: Record<string, { label: string; dot: string }> = {
  active: { label: "Connected", dot: "bg-green-500" },
  error: { label: "Error", dot: "bg-red-500" },
  pending_auth: { label: "Needs sign-in", dot: "bg-amber-500" },
  revoked: { label: "Revoked", dot: "bg-red-500" },
}

function AgentNodeInner({ data, selected }: NodeProps<AgentFlowNode>) {
  const status = data.status ?? "draft"
  const dim = status !== "published"
  const runLabel = data.last_run_status ? RUN_STATUS_LABEL[data.last_run_status] ?? data.last_run_status : null

  return (
    <div
      className={cn(
        "w-[236px] rounded-xl border bg-card px-3 py-2.5 text-card-foreground shadow-sm transition-shadow",
        selected ? "border-primary ring-2 ring-primary/20" : "hover:shadow-md",
        dim && "opacity-70",
      )}
    >
      <Handle type="target" position={Position.Left} className={handleClass} />
      <Handle type="source" position={Position.Right} className={handleClass} />

      <div className="flex items-start gap-2.5">
        <div className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <AgentIcon icon={data.icon ?? "robot"} className="size-4" />
          {data.running && (
            <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight" title={data.name}>
            {data.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-1.5 shrink-0 rounded-full", AGENT_STATUS_DOT[status] ?? "bg-gray-400")} />
            <span>{AGENT_STATUS_LABEL[status] ?? status}</span>
            {(data.schedule || data.onMessage) && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">
                  {[data.schedule, data.onMessage ? "on message" : null].filter(Boolean).join(" + ")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">
          {data.running
            ? "Running now"
            : data.last_run_at
              ? `Last run ${timeAgo(data.last_run_at)}${runLabel ? ` · ${runLabel}` : ""}`
              : "Never run"}
        </span>
        {data.runs_24h > 0 && (
          <span className="ml-2 shrink-0 rounded-full bg-muted px-1.5 py-px font-medium tabular-nums">
            {data.runs_24h} / 24h
          </span>
        )}
      </div>
    </div>
  )
}

function ConnectorNodeInner({ data, selected }: NodeProps<ConnectorFlowNode>) {
  const src = data.type ? connectorIconSrc(data.type, data.name) : undefined
  const ok = data.status === "active"
  const st = CONNECTOR_STATUS[data.status ?? ""] ?? { label: data.status ?? "Unknown", dot: "bg-gray-400" }

  return (
    <div
      className={cn(
        "flex w-[208px] items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-card-foreground shadow-sm transition-shadow",
        selected ? "border-primary ring-2 ring-primary/20" : "hover:shadow-md",
        !ok && "opacity-70",
      )}
    >
      <Handle type="source" position={Position.Right} className={handleClass} />
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {src ? (
          <Image src={src} alt="" width={18} height={18} />
        ) : (
          <Plug className="size-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium leading-tight" title={data.name}>
          {data.name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={cn("size-1.5 shrink-0 rounded-full", st.dot)} />
          <span className="truncate">{st.label}</span>
        </div>
      </div>
    </div>
  )
}

export const AgentNode = memo(AgentNodeInner)
export const ConnectorNode = memo(ConnectorNodeInner)
