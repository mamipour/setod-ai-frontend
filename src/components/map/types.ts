import type { Edge, Node } from "@xyflow/react"
import type { GraphEdge, GraphNode } from "@/lib/api"

// React Flow wants node data to satisfy Record<string, unknown>. Interfaces have no implicit
// index signature, so re-map the API interface into an anonymous object type first.
type NodeBase = { [K in keyof GraphNode]: GraphNode[K] }

/** Agent node payload: the API node plus a few facts derived from the edge list. */
export type AgentNodeData = NodeBase & {
  kind: "agent"
  /** True when a channel connector triggers this agent (shown as "on message"). */
  onMessage: boolean
  /** Names of connectors wired to this agent, for the side panel. */
  connectorNames: string[]
  /** Agents this one can call / is called by, for the side panel. */
  calls: { id: string; name: string; description: string }[]
  calledBy: { id: string; name: string; description: string }[]
}

export type ConnectorNodeData = NodeBase & {
  kind: "connector"
  /** Agents wired to this connector, for the side panel. */
  usedBy: string[]
  /** Agents this connector triggers on inbound messages. */
  triggers: string[]
}

export type AgentFlowNode = Node<AgentNodeData, "agent">
export type ConnectorFlowNode = Node<ConnectorNodeData, "connector">
export type FlowNode = AgentFlowNode | ConnectorFlowNode

export type GraphEdgeData = Pick<GraphEdge, "kind" | "label" | "active" | "count_24h">
export type FlowEdge = Edge<GraphEdgeData, "graph">

export const AGENT_W = 236
export const AGENT_H = 92
export const CONNECTOR_W = 208
export const CONNECTOR_H = 64
