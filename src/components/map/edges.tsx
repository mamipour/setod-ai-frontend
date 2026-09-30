"use client"

import { memo } from "react"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"
import type { FlowEdge } from "./types"

/**
 * One edge component for all three relationship kinds:
 *  - uses    connector → agent, solid
 *  - trigger connector → agent, dashed (marching when the agent ran in the window)
 *  - calls   agent → agent, accent colour with a "n / 24h" pill
 * Edges with no activity in the window are drawn faint so the live wiring stands out.
 */
function GraphEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<FlowEdge>) {
  const kind = data?.kind ?? "uses"
  const active = data?.active ?? false
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })

  const stroke =
    kind === "calls"
      ? "var(--map-edge-calls)"
      : "var(--map-edge)"

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={cn(kind === "trigger" && active && "map-edge-marching")}
        style={{
          stroke,
          strokeWidth: selected ? 2.5 : kind === "calls" ? 2 : 1.5,
          strokeDasharray: kind === "trigger" ? "6 4" : undefined,
          opacity: active || selected ? 1 : 0.35,
        }}
      />
      {kind === "calls" && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan pointer-events-auto absolute rounded-full border bg-card px-1.5 py-px text-[10px] font-medium tabular-nums shadow-sm",
              active ? "text-foreground" : "text-muted-foreground opacity-60",
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, borderColor: stroke }}
            title={data?.label || "Agent call"}
          >
            {data?.count_24h ? `${data.count_24h} call${data.count_24h === 1 ? "" : "s"} / 24h` : "calls"}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const GraphEdge = memo(GraphEdgeInner)
