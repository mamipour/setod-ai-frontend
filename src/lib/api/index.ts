/**
 * Public API for the platform UI.
 *
 * This barrel re-exports everything from the domain sub-modules so that
 * existing imports of "@/lib/api" continue to work unchanged.
 *
 * Sub-module layout:
 *   base.ts          — API_BASE, ApiError, apiFetch
 *   auth.ts          — OrgMembership, CurrentUser, Invitation, auth
 *   connectors.ts    — ConnectorType, ConnectorStatus, Connector, connectors
 *   agents.ts        — Agent, AgentSettings, Session, agents, …
 *   approvals.ts     — ApprovalRequest, approvals, invitations, notes, skills
 *   workspace.ts     — WebSearchSettings, workspace
 *   conversations.ts — ConversationSummary, conversations
 *   tables.ts        — OrgTable, tablesApi
 *   billing.ts       — OrgPlan, billing
 *   voice.ts         — voice, tokenInvitations
 *   code-skills.ts   — CodeSkill, codeSkills
 */
export { API_BASE, ApiError } from "./base"
export * from "./auth"
export * from "./connectors"
export * from "./agents"
export * from "./approvals"
export * from "./workspace"
export * from "./conversations"
export * from "./tables"
export * from "./billing"
export * from "./voice"
export * from "./code-skills"
