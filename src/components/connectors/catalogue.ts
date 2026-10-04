/**
 * Connector catalogue — the static list of available connector types,
 * their metadata, and helper utilities.
 *
 * Extracted from app/(dashboard)/connectors/page.tsx (R1 refactor) so that
 * the page component and any future admin/onboarding page can import the
 * catalogue without bundling the full page.
 */
import type { ConnectorType, Connector } from "@/lib/api"

export interface CatalogueEntry {
  type: ConnectorType
  catalogKey?: string
  label: string
  description: string
  icon: string
  iconSrc?: string
  authMethod: "oauth" | "api_key" | "generated" | "mcp_oauth" | "mcp_token"
  defaultUrl?: string
  urlRequired?: boolean
  available: boolean
  category: "Email" | "Messaging" | "SMS & Voice" | "Automation" | "CRM" | "Productivity" | "E-commerce" | "Local business" | "Scheduling" | "MCP servers"
}

export const CATALOGUE: CatalogueEntry[] = [
  {
    type: "gmail",
    label: "Gmail",
    description: "Gmail inbox and Google Calendar via App Password.",
    icon: "✉️",
    iconSrc: "/google.svg",
    authMethod: "api_key",
    available: true,
    category: "Email",
  },
  {
    type: "telegram_bot",
    label: "Telegram Bot",
    description: "Receive messages and respond via a Telegram Bot.",
    icon: "✈️",
    iconSrc: "/telegram-bot.svg",
    authMethod: "api_key",
    available: true,
    category: "Messaging",
  },
  {
    type: "telegram_client",
    label: "Telegram Account",
    description: "Send and receive messages as a real Telegram user.",
    icon: "📱",
    iconSrc: "/telegram.svg",
    authMethod: "api_key",
    available: true,
    category: "Messaging",
  },
  {
    type: "twilio",
    label: "Twilio SMS",
    description: "Send SMS replies and handle missed call recovery.",
    icon: "📞",
    iconSrc: "/twilio.svg",
    authMethod: "api_key",
    available: true,
    category: "SMS & Voice",
  },
  {
    type: "webhook",
    label: "Inbound Webhook",
    description: "Trigger agents from any external system, form, or automation.",
    icon: "🔗",
    authMethod: "generated",
    available: true,
    category: "Automation",
  },
  {
    type: "slack_webhook",
    label: "Slack Webhook",
    description: "Post outbound messages to a Slack channel via an Incoming Webhook URL.",
    icon: "#",
    iconSrc: "/slack.svg",
    authMethod: "api_key",
    available: true,
    category: "Automation",
  },
  // google_sheets: disabled — use Airtable instead (easier to connect)
  // {
  //   type: "google_sheets",
  //   label: "Google Sheets",
  //   description: "Read and write spreadsheet data using a service account.",
  //   icon: "📊",
  //   iconSrc: "/google-sheet.svg",
  //   authMethod: "api_key",
  //   available: true,
  //   category: "Automation",
  // },
  {
    type: "whatsapp",
    label: "WhatsApp Business",
    description: "Send and receive WhatsApp messages via Meta's Cloud API.",
    icon: "💬",
    iconSrc: "/whatsapp.svg",
    authMethod: "api_key",
    available: true,
    category: "SMS & Voice",
  },
  {
    type: "instagram",
    label: "Instagram",
    description: "Reply to comments, moderate posts, and answer DMs on your Instagram Business account.",
    icon: "📷",
    iconSrc: "/instagram.svg",
    authMethod: "oauth",
    available: true,
    category: "Messaging",
  },
  {
    type: "hubspot",
    label: "HubSpot",
    description: "Find contacts, open deals, and log notes in HubSpot CRM.",
    icon: "🔶",
    iconSrc: "/hubspot.svg",
    authMethod: "api_key",
    available: true,
    category: "CRM",
  },
  {
    type: "pipedrive",
    label: "Pipedrive",
    description: "Find persons, create deals, and log activities in Pipedrive CRM.",
    icon: "🟢",
    iconSrc: "/pipedrive.svg",
    authMethod: "api_key",
    available: true,
    category: "CRM",
  },
  {
    type: "airtable",
    label: "Airtable",
    description: "List, find, create and update Airtable records across your bases.",
    icon: "📋",
    iconSrc: "/airtable.svg",
    authMethod: "api_key",
    available: true,
    category: "Productivity",
  },
  {
    type: "shopify",
    label: "Shopify",
    description: "Look up orders and customers, search products, add notes, and cancel orders.",
    icon: "🛒",
    iconSrc: "/shopify.svg",
    authMethod: "api_key",
    available: true,
    category: "E-commerce",
  },
  // {
  //   type: "google_business_profile",
  //   label: "Google Business Profile",
  //   description: "List reviews for your Google location and reply or delete replies.",
  //   icon: "⭐",
  //   iconSrc: "/google-business.svg",
  //   authMethod: "oauth",
  //   available: true,
  //   category: "Local business",
  // },
  {
    type: "calendly",
    label: "Calendly",
    description: "List event types, check availability, send booking links, and manage meetings.",
    icon: "📅",
    iconSrc: "/calendly.svg",
    authMethod: "api_key",
    available: true,
    category: "Scheduling",
  },
  {
    type: "mcp",
    catalogKey: "github",
    label: "GitHub",
    description: "Issues, pull requests, and repos via GitHub's remote MCP server.",
    icon: "⌥",
    iconSrc: "/github.svg",
    authMethod: "mcp_token",
    defaultUrl: "https://api.githubcopilot.com/mcp",
    available: true,
    category: "MCP servers",
  },
  {
    type: "mcp",
    catalogKey: "linear",
    label: "Linear",
    description: "Search and update Linear issues from an agent.",
    icon: "⬡",
    iconSrc: "/linear.svg",
    authMethod: "mcp_oauth",
    defaultUrl: "https://mcp.linear.app/mcp",
    available: true,
    category: "MCP servers",
  },
  {
    type: "mcp",
    catalogKey: "notion",
    label: "Notion (MCP)",
    description: "Read and update Notion pages and databases via Notion's official MCP server.",
    icon: "N",
    iconSrc: "/notion.svg",
    authMethod: "mcp_oauth",
    defaultUrl: "https://mcp.notion.com/mcp",
    available: true,
    category: "MCP servers",
  },
  {
    type: "mcp",
    catalogKey: "slack",
    label: "Slack (MCP)",
    description: "Read channels, search messages, and post anywhere via Slack's official MCP server.",
    icon: "#",
    iconSrc: "/slack.svg",
    authMethod: "mcp_oauth",
    defaultUrl: "https://mcp.slack.com/mcp",
    available: true,
    category: "MCP servers",
  },
  {
    type: "mcp",
    catalogKey: "atlassian",
    label: "Atlassian",
    description: "Jira and Confluence through Atlassian's remote MCP server.",
    icon: "A",
    iconSrc: "/atlassian.svg",
    authMethod: "mcp_oauth",
    defaultUrl: "https://mcp.atlassian.com/v1/mcp",
    available: true,
    category: "MCP servers",
  },
  {
    type: "mcp",
    catalogKey: "zapier",
    label: "Zapier",
    description: "Actions across Zapier's connected apps. Paste the MCP URL Zapier gives you.",
    icon: "Z",
    iconSrc: "/zapier.svg",
    authMethod: "mcp_token",
    urlRequired: true,
    available: true,
    category: "MCP servers",
  },
  {
    type: "mcp",
    catalogKey: "custom",
    label: "Custom MCP server",
    description: "Any HTTPS MCP server you run. We probe for OAuth or a bearer token.",
    icon: "🔌",
    iconSrc: "/mcp.svg",
    authMethod: "mcp_token",
    urlRequired: true,
    available: true,
    category: "MCP servers",
  },
]

export const CATEGORIES: CatalogueEntry["category"][] = ["Email", "Messaging", "SMS & Voice", "Automation", "CRM", "Productivity", "Scheduling", "E-commerce", "Local business", "MCP servers"]

export const CATEGORY_LABEL: Record<CatalogueEntry["category"], string> = {
  "Email":          "Email",
  "Messaging":      "Messaging",
  "SMS & Voice":    "SMS & Voice",
  "Automation":     "Automation",
  "CRM":            "CRM",
  "Productivity":   "Productivity",
  "Scheduling":     "Scheduling",
  "E-commerce":     "E-commerce",
  "Local business": "Local business",
  "MCP servers":    "MCP servers",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function catalogueFor(connector: { type: string; name: string }): CatalogueEntry | undefined {
  if (connector.type !== "mcp") {
    return CATALOGUE.find((c) => c.type === connector.type as CatalogueEntry["type"])
  }
  const branded = CATALOGUE.find((c) => {
    if (c.type !== "mcp" || !c.catalogKey || c.catalogKey === "custom") return false
    return connector.name === c.label || connector.name.startsWith(`${c.label} ·`)
  })
  return branded ?? CATALOGUE.find((c) => c.catalogKey === "custom")
}
