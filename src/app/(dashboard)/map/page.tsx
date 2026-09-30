"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { RefreshCw } from "lucide-react"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { workspace, type WorkspaceGraph } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { buildFlow } from "@/components/map/layout"
import { AgentNode, ConnectorNode } from "@/components/map/nodes"
import { GraphEdge } from "@/components/map/edges"
import { NodePanel } from "@/components/map/NodePanel"
import type { FlowNode } from "@/components/map/types"
import { cn } from "@/lib/utils"

const REFRESH_MS = 30_000

// Stable references: React Flow re-registers node/edge types when these change identity.
const nodeTypes = { agent: AgentNode, connector: ConnectorNode }
const edgeTypes = { graph: GraphEdge }

export default function MapPage() {
  return (
    <ReactFlowProvider>
      <MapInner />
    </ReactFlowProvider>
  )
}

function MapInner() {
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""
  const { resolvedTheme } = useTheme()
  const { fitView } = useReactFlow()

  const [graph, setGraph] = useState<WorkspaceGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // Same shape as useAgents: the effect only reacts to responses; the Refresh button bumps
  // `tick` to re-run it, and the interval re-runs it on its own every REFRESH_MS.
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    const run = () =>
      workspace
        .getGraph(orgId)
        .then((g) => {
          if (cancelled) return
          setGraph(g)
          setError(null)
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message || "Failed to load the workspace map")
        })
        .finally(() => {
          if (!cancelled) setRefreshing(false)
        })
    run()
    const id = setInterval(run, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [orgId, tick])

  const refresh = useCallback(() => {
    setRefreshing(true)
    setTick((t) => t + 1)
  }, [])

  const { nodes, edges } = useMemo(
    () => (graph ? buildFlow(graph) : { nodes: [], edges: [] }),
    [graph],
  )

  // Fit once the layout is known, and again only when the *shape* of the graph changes,
  // so a 30s refresh never yanks the viewport away from what the user is looking at.
  const shapeKey = useMemo(
    () => nodes.map((n) => n.id).sort().join("|") + "#" + edges.map((e) => e.id).sort().join("|"),
    [nodes, edges],
  )
  const lastShape = useRef<string | null>(null)
  useEffect(() => {
    if (!nodes.length || lastShape.current === shapeKey) return
    lastShape.current = shapeKey
    // Let React Flow measure the freshly mounted nodes before fitting.
    const t = setTimeout(() => void fitView({ padding: 0.2, duration: 300 }), 50)
    return () => clearTimeout(t)
  }, [shapeKey, nodes.length, fitView])

  const selected: FlowNode | null = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  const onNodeClick: NodeMouseHandler<FlowNode> = useCallback((_, node) => setSelectedId(node.id), [])

  const agentCount = graph?.nodes.filter((n) => n.kind === "agent").length ?? 0
  const connectorCount = graph?.nodes.filter((n) => n.kind === "connector").length ?? 0
  const callCount = graph?.edges.filter((e) => e.kind === "calls").length ?? 0
  const windowHours = graph?.window_hours ?? 24

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 md:h-[calc(100vh-3rem)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Map</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How your agents are wired: which accounts they use, what wakes them up, and who calls whom.
            Read-only; edit an agent to change its wiring.
          </p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-background">
        {graph && agentCount === 0 ? (
          <div className="flex h-full flex-col items-start justify-center gap-2 px-8 text-sm text-muted-foreground">
            <p>No agents yet, so there is nothing to map.</p>
            <Link href="/agents" className="underline underline-offset-4 hover:text-foreground">
              Create your first agent
            </Link>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedId(null)}
            // Read-only canvas: look, pan, zoom, click. No dragging, wiring or deleting.
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            edgesFocusable={false}
            deleteKeyCode={null}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            panOnScroll
            zoomOnDoubleClick={false}
            minZoom={0.3}
            maxZoom={1.75}
            className="!bg-background"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls showInteractive={false} position="bottom-right" />
            <MiniMap
              position="bottom-left"
              pannable
              zoomable
              nodeStrokeWidth={2}
              nodeColor={(n) => (n.type === "agent" ? "var(--primary)" : "var(--muted-foreground)")}
              style={{ width: 150, height: 100 }}
              className="!hidden !rounded-lg !border md:!block"
            />
            <Panel position="top-left" className="!m-3">
              <Legend agentCount={agentCount} connectorCount={connectorCount} callCount={callCount} windowHours={windowHours} />
            </Panel>
          </ReactFlow>
        )}

        {!graph && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading map…
          </div>
        )}
      </div>

      <NodePanel node={selected} windowHours={windowHours} onClose={() => setSelectedId(null)} />
    </div>
  )
}

function Legend({
  agentCount,
  connectorCount,
  callCount,
  windowHours,
}: {
  agentCount: number
  connectorCount: number
  callCount: number
  windowHours: number
}) {
  return (
    <div className="rounded-lg border bg-card/90 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
      <div className="mb-1.5 font-medium text-foreground">
        {agentCount} agent{agentCount === 1 ? "" : "s"} · {connectorCount} connector{connectorCount === 1 ? "" : "s"}
        {callCount > 0 && ` · ${callCount} agent link${callCount === 1 ? "" : "s"}`}
      </div>
      <ul className="space-y-1">
        <li className="flex items-center gap-2">
          <svg width="28" height="8" aria-hidden><line x1="0" y1="4" x2="28" y2="4" stroke="var(--map-edge)" strokeWidth="1.5" /></svg>
          uses connector
        </li>
        <li className="flex items-center gap-2">
          <svg width="28" height="8" aria-hidden><line x1="0" y1="4" x2="28" y2="4" stroke="var(--map-edge)" strokeWidth="1.5" strokeDasharray="6 4" /></svg>
          woken by incoming message
        </li>
        <li className="flex items-center gap-2">
          <svg width="28" height="8" aria-hidden><line x1="0" y1="4" x2="28" y2="4" stroke="var(--map-edge-calls)" strokeWidth="2" /></svg>
          calls another agent
        </li>
        <li className="pt-0.5 text-muted-foreground/80">Faint lines had no activity in the last {windowHours}h.</li>
      </ul>
    </div>
  )
}
