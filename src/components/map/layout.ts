import dagre from "@dagrejs/dagre"
import type { WorkspaceGraph } from "@/lib/api"
import {
  AGENT_H,
  AGENT_W,
  CONNECTOR_H,
  CONNECTOR_W,
  type AgentNodeData,
  type ConnectorNodeData,
  type FlowEdge,
  type FlowNode,
} from "./types"

/**
 * Turn the API payload into positioned React Flow nodes and edges.
 *
 * dagre lays the graph out left-to-right: connectors land in the first column because
 * every edge that touches them points into an agent, agents in the second, and agents
 * that are only ever *called* by other agents drift into a third. Agents with no edges at
 * all would otherwise share column one with the connectors, so they are nudged into the
 * agent column afterwards.
 */
export function buildFlow(graph: WorkspaceGraph): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))

  // ── Derive per-node facts from the edge list (side panel + node subtitles) ──
  const connectorNames = new Map<string, string[]>()
  const onMessage = new Set<string>()
  const calls = new Map<string, { id: string; name: string; description: string }[]>()
  const calledBy = new Map<string, { id: string; name: string; description: string }[]>()
  const usedBy = new Map<string, string[]>()
  const triggers = new Map<string, string[]>()

  for (const e of graph.edges) {
    const src = byId.get(e.source)
    const tgt = byId.get(e.target)
    if (!src || !tgt) continue
    if (e.kind === "uses") {
      connectorNames.set(e.target, [...(connectorNames.get(e.target) ?? []), src.name])
      usedBy.set(e.source, [...(usedBy.get(e.source) ?? []), tgt.name])
    } else if (e.kind === "trigger") {
      onMessage.add(e.target)
      triggers.set(e.source, [...(triggers.get(e.source) ?? []), tgt.name])
    } else if (e.kind === "calls") {
      calls.set(e.source, [...(calls.get(e.source) ?? []), { id: tgt.id, name: tgt.name, description: e.label ?? "" }])
      calledBy.set(e.target, [...(calledBy.get(e.target) ?? []), { id: src.id, name: src.name, description: e.label ?? "" }])
    }
  }

  const nodes: FlowNode[] = graph.nodes.map((n) => {
    if (n.kind === "agent") {
      const data: AgentNodeData = {
        ...n,
        kind: "agent",
        onMessage: onMessage.has(n.id),
        connectorNames: connectorNames.get(n.id) ?? [],
        calls: calls.get(n.id) ?? [],
        calledBy: calledBy.get(n.id) ?? [],
      }
      return { id: n.id, type: "agent", position: { x: 0, y: 0 }, data, width: AGENT_W, height: AGENT_H }
    }
    const data: ConnectorNodeData = {
      ...n,
      kind: "connector",
      usedBy: usedBy.get(n.id) ?? [],
      triggers: triggers.get(n.id) ?? [],
    }
    return { id: n.id, type: "connector", position: { x: 0, y: 0 }, data, width: CONNECTOR_W, height: CONNECTOR_H }
  })

  const edges: FlowEdge[] = graph.edges
    .filter((e) => byId.has(e.source) && byId.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "graph",
      data: { kind: e.kind, label: e.label, active: e.active, count_24h: e.count_24h },
      // Calls stack above the connector wiring so they stay legible when they cross.
      zIndex: e.kind === "calls" ? 2 : 1,
    }))

  // ── dagre ────────────────────────────────────────────────────────────────
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 170, marginx: 16, marginy: 16 })
  for (const n of nodes) g.setNode(n.id, { width: n.width!, height: n.height! })
  for (const e of edges) g.setEdge(e.source, e.target)
  dagre.layout(g)

  for (const n of nodes) {
    const p = g.node(n.id)
    n.position = { x: p.x - n.width! / 2, y: p.y - n.height! / 2 }
  }

  // ── Pin every connector to the first column ─────────────────────────────
  // dagre ranks a node as close to its consumers as it can, so a connector used only by a
  // *called* agent would land among the agents. Readers expect "accounts on the left,
  // agents on the right", so connectors are re-stacked in column one, keeping dagre's
  // vertical order (which already minimises crossings) and centring the stack on the agents.
  const connectors = nodes.filter((n) => n.type === "connector").sort((a, b) => a.position.y - b.position.y)
  const agents = nodes.filter((n) => n.type === "agent")
  const GAP = 28
  if (connectors.length) {
    const colX = Math.min(...nodes.map((n) => n.position.x))
    const stackH = connectors.length * CONNECTOR_H + (connectors.length - 1) * GAP
    const agentTop = agents.length ? Math.min(...agents.map((n) => n.position.y)) : 0
    const agentBottom = agents.length ? Math.max(...agents.map((n) => n.position.y + AGENT_H)) : stackH
    let y = (agentTop + agentBottom) / 2 - stackH / 2
    for (const n of connectors) {
      n.position = { x: colX, y }
      y += CONNECTOR_H + GAP
    }
  }

  // ── Nudge edge-less agents into the agent column ─────────────────────────
  // An agent with no edges gets rank 0 from dagre and would sit among the connectors.
  const hasEdge = new Set(edges.flatMap((e) => [e.source, e.target]))
  const wiredAgents = agents.filter((n) => hasEdge.has(n.id))
  const looseAgents = agents.filter((n) => !hasEdge.has(n.id))
  if (looseAgents.length) {
    const connectorX = connectors.length ? connectors[0].position.x : 0
    const colX = wiredAgents.length
      ? Math.min(...wiredAgents.map((n) => n.position.x))
      : connectorX + CONNECTOR_W + 170
    const inCol = wiredAgents.filter((n) => n.position.x === colX)
    let y = inCol.length ? Math.max(...inCol.map((n) => n.position.y + AGENT_H)) + GAP : 0
    for (const n of looseAgents) {
      n.position = { x: colX, y }
      y += AGENT_H + GAP
    }
  }

  return { nodes, edges }
}
