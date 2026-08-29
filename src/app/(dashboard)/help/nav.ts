/** Single source of truth for the help sidebar and the "next page" footers. */
export const HELP_NAV = [
  { href: "/help", title: "Start here" },
  { href: "/help/connectors", title: "Connecting accounts" },
  { href: "/help/mcp", title: "MCP servers" },
  { href: "/help/instructions", title: "Writing instructions" },
  { href: "/help/tools", title: "Tool reference" },
  { href: "/help/knowledge", title: "Knowledge files" },
  { href: "/help/notes", title: "Workspace notes" },
  { href: "/help/agent-calls", title: "Agent calls agent" },
  { href: "/help/skills", title: "Skills" },
  { href: "/help/schedules", title: "Triggers and schedules" },
  { href: "/help/publishing", title: "Testing and publishing" },
  { href: "/help/runs", title: "Runs and troubleshooting" },
  { href: "/help/approvals", title: "Tool approvals" },
  { href: "/help/memory", title: "How it avoids repeating itself" },
  { href: "/help/settings", title: "Settings, cost and limits" },
  { href: "/help/security", title: "Security and what's missing" },
] as const

export function nextPage(href: string) {
  const i = HELP_NAV.findIndex((p) => p.href === href)
  return i >= 0 && i < HELP_NAV.length - 1 ? HELP_NAV[i + 1] : null
}
