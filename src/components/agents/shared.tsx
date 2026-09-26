"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  Bell,
  Bot,
  BrainCircuit,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  FileSearch,
  Inbox,
  Mail,
  MessageSquare,
  Moon,
  Pencil,
  PhoneMissed,
  Search,
  Shield,
  Sparkles,
  Star,
  UserSearch,
  Zap,
  type LucideIcon,
} from "lucide-react"
import type { AgentStatus, Connector, SessionStatus, TriggerType } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Connector icons ────────────────────────────────────────────────────────────

export const CONNECTOR_ICON: Partial<Record<string, string>> = {
  gmail: "/google.svg",
  telegram_bot: "/telegram-bot.svg",
  telegram_client: "/telegram.svg",
  twilio: "/twilio.svg",
  openai: "/openai.svg",
  anthropic: "/anthropic.svg",
  mcp: "/mcp.svg",
  slack_webhook: "/slack.svg",
  google_sheets: "/google-sheet.svg",
  whatsapp: "/whatsapp.svg",
  instagram: "/instagram.svg",
  hubspot: "/hubspot.svg",
  pipedrive: "/pipedrive.svg",
}

const MCP_ICON_BY_LABEL: Array<[string, string]> = [
  ["GitHub", "/github.svg"],
  ["Linear", "/linear.svg"],
  ["Notion", "/notion.svg"],
  ["Slack", "/slack.svg"],
  ["Atlassian", "/atlassian.svg"],
  ["Zapier", "/zapier.svg"],
]

export function connectorIconSrc(type: string, name?: string): string | undefined {
  if (type === "mcp" && name) {
    const match = MCP_ICON_BY_LABEL.find(([label]) => name === label || name.startsWith(`${label} ·`))
    if (match) return match[1]
    return "/mcp.svg"
  }
  return CONNECTOR_ICON[type]
}

// ── Connector tool catalogue ───────────────────────────────────────────────────
// Static list of every tool each connector type exposes. Mirrors the integrations
// layer so the create flow can show pills without a round-trip after attachment.

export const CONNECTOR_TOOLS: Partial<Record<string, Array<{ name: string; description: string }>>> = {
  gmail: [
    { name: "read_unread_emails", description: "List unread emails (skips already handled)" },
    { name: "search_emails",      description: "Search by Gmail query — bypasses handled filter" },
    { name: "send_email",         description: "Send a new email" },
    { name: "reply_to_email",     description: "Reply in the same thread" },
    { name: "archive_email",      description: "Remove from inbox (not deleted)" },
    { name: "list_calendar_events", description: "List events on the primary Google Calendar" },
    { name: "create_calendar_event", description: "Create a calendar event (can invite attendees)" },
  ],
  telegram_bot: [
    { name: "send_telegram_message", description: "Send to the linked chat" },
  ],
  telegram_client: [
    { name: "send_telegram_message", description: "Send to any username or phone number" },
    { name: "read_telegram_messages", description: "List chats with unread messages" },
  ],
  twilio: [
    { name: "send_sms", description: "Send an SMS (costs money per message)" },
  ],
  whatsapp: [
    { name: "send_whatsapp_message",  description: "Send a text reply (within 24-hour window)" },
    { name: "read_whatsapp_messages", description: "List recent inbound messages" },
  ],
  instagram: [
    { name: "get_instagram_posts",           description: "List recent posts with their IDs" },
    { name: "get_instagram_comments",        description: "Get comments on a specific post" },
    { name: "reply_to_instagram_comment",    description: "Reply publicly to a comment" },
    { name: "hide_instagram_comment",        description: "Hide or unhide a comment" },
    { name: "delete_instagram_comment",      description: "Permanently delete a comment" },
    { name: "read_instagram_messages",       description: "List recent inbound DMs" },
    { name: "reply_to_instagram_dm",         description: "Reply to a DM (within 24-hour window)" },
  ],
  hubspot: [
    { name: "find_hubspot_contact",           description: "Look up a contact by email" },
    { name: "create_hubspot_contact",         description: "Create a new contact" },
    { name: "update_hubspot_contact",         description: "Update contact properties" },
    { name: "create_hubspot_deal",            description: "Open a new deal (optionally linked to a contact)" },
    { name: "move_hubspot_deal",              description: "Move a deal to a different pipeline stage" },
    { name: "log_hubspot_note",               description: "Log a timestamped note on a contact" },
    { name: "list_hubspot_pipeline_stages",   description: "List pipelines and their stage ids" },
  ],
  pipedrive: [
    { name: "find_pipedrive_person",          description: "Look up a person by email" },
    { name: "create_pipedrive_person",        description: "Create a new person" },
    { name: "update_pipedrive_person",        description: "Update person fields" },
    { name: "create_pipedrive_deal",          description: "Open a new deal (optionally linked to a person)" },
    { name: "move_pipedrive_deal",            description: "Move a deal to a different stage" },
    { name: "log_pipedrive_activity",         description: "Log a note/activity on a person or deal" },
    { name: "list_pipedrive_stages",          description: "List pipeline stages and their ids" },
  ],
}

// ── Brain picker ───────────────────────────────────────────────────────────────

export function BrainPicker({
  brains,
  value,
  onChange,
}: {
  brains: Connector[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = brains.find((b) => b.id === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const options = [
    ...(value ? [] : [{ id: "", name: "Not set", type: undefined as string | undefined }]),
    ...brains.map((b) => ({ id: b.id, name: b.name, type: b.type as string })),
  ]

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none hover:bg-muted/40"
      >
        {selected && CONNECTOR_ICON[selected.type] && (
          <Image src={CONNECTOR_ICON[selected.type]!} alt="" width={16} height={16} className="shrink-0" />
        )}
        <span className="flex-1 truncate text-left">{selected?.name ?? "Not set"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-20 w-full rounded-lg border bg-card shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onChange(opt.id); setOpen(false) }}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-2 text-sm transition-colors hover:bg-muted first:rounded-t-lg last:rounded-b-lg",
                opt.id === value && "bg-primary/5 text-primary",
              )}
            >
              {opt.type && CONNECTOR_ICON[opt.type] ? (
                <Image src={CONNECTOR_ICON[opt.type]!} alt="" width={16} height={16} className="shrink-0" />
              ) : (
                <div className="size-4 shrink-0" />
              )}
              <span className="truncate">{opt.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Icons are stored as strings on the agent so the backend never imports a UI library.
const ICONS: Record<string, LucideIcon> = {
  robot: Bot,
  "phone-missed": PhoneMissed,
  inbox: Inbox,
  moon: Moon,
  "user-search": UserSearch,
  "calendar-clock": CalendarClock,
  star: Star,
  bell: Bell,
  "brain-circuit": BrainCircuit,
  "clipboard-list": ClipboardList,
  clock: Clock,
  "file-search": FileSearch,
  mail: Mail,
  "message-square": MessageSquare,
  search: Search,
  shield: Shield,
  sparkles: Sparkles,
  zap: Zap,
}

export function AgentIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Bot
  return <Icon className={cn("size-5 shrink-0", className)} />
}

/**
 * The agent's icon tile, clickable: opens a small grid of the available icons.
 * The set is fixed (ICONS above) because the backend stores plain strings.
 */
export function IconPicker({
  icon,
  className,
  onPick,
}: {
  icon: string
  className?: string
  onPick: (icon: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change icon"
        className={cn(
          "group relative flex size-11 shrink-0 items-center justify-center rounded-xl transition-shadow hover:ring-2 hover:ring-primary/30",
          className,
        )}
      >
        <AgentIcon icon={icon} className="size-5" />
        {/* Pencil hint on hover */}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <Pencil className="size-3 text-white" />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-20 grid w-52 grid-cols-5 gap-1 rounded-xl border bg-card p-2 shadow-lg">
          {Object.keys(ICONS).map((key) => (
            <button
              key={key}
              type="button"
              title={key}
              onClick={() => {
                setOpen(false)
                onPick(key)
              }}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted",
                key === icon && "bg-primary/10 text-primary",
              )}
            >
              <AgentIcon icon={key} className="size-4" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function untilNow(iso: string): string {
  const diff = Math.floor((new Date(iso).getTime() - Date.now()) / 1000)
  if (diff < 60) return "in under a minute"
  if (diff < 3600) return `in ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `in ${Math.floor(diff / 3600)}h`
  return `in ${Math.floor(diff / 86400)}d`
}

export function duration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "running"
  const secs = (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
  return secs < 60 ? `${secs.toFixed(1)}s` : `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`
}

/** Per-model pricing (USD per million tokens): [input_price, output_price]. */
const MODEL_PRICING: Record<string, [number, number]> = {
  // OpenAI
  "gpt-4o":              [2.50,  10.00],
  "gpt-4o-mini":         [0.15,   0.60],
  "gpt-4-turbo":         [10.00, 30.00],
  "gpt-4":               [30.00, 60.00],
  "gpt-3.5-turbo":       [0.50,   1.50],
  "o1":                  [15.00, 60.00],
  "o1-mini":             [3.00,  12.00],
  "o3-mini":             [1.10,   4.40],
  // Anthropic
  "claude-opus-4-5":     [15.00, 75.00],
  "claude-sonnet-4-5":   [3.00,  15.00],
  "claude-haiku-3-5":    [0.80,   4.00],
  "claude-opus-4":       [15.00, 75.00],
  "claude-sonnet-4":     [3.00,  15.00],
  "claude-haiku-3":      [0.25,   1.25],
}

const DEFAULT_PRICE: [number, number] = [0.15, 0.60]  // gpt-4o-mini (platform default model)

function priceFor(modelSlug: string): [number, number] {
  if (!modelSlug) return DEFAULT_PRICE
  // Try exact match first, then prefix match.
  for (const [key, price] of Object.entries(MODEL_PRICING)) {
    if (modelSlug === key || modelSlug.startsWith(key)) return price
  }
  return DEFAULT_PRICE
}

/** Tokens are meaningless to an SMB owner; roughly what it cost them is not. */
export function approxCost(tokens: number, modelSlug = ""): string {
  const [inputPrice, outputPrice] = priceFor(modelSlug)
  // Without prompt/completion split fall back to average of in+out price.
  const avgPrice = (inputPrice + outputPrice) / 2
  const dollars = (tokens / 1_000_000) * avgPrice
  if (dollars < 0.01) return "<$0.01"
  return `~$${dollars.toFixed(3)}`
}

/** Calculate cost with prompt/completion split for the detail view. */
export function costBreakdown(promptTokens: number, completionTokens: number, modelSlug = ""): string {
  const [inputPrice, outputPrice] = priceFor(modelSlug)
  const dollars = (promptTokens / 1_000_000) * inputPrice + (completionTokens / 1_000_000) * outputPrice
  if (dollars < 0.001) return "<$0.001"
  return `~$${dollars.toFixed(4)}`
}

export function tokensForBudget(dollars: number): number {
  return Math.round((dollars / DEFAULT_PRICE[1]) * 1_000_000)
}

export function AgentStatusBadge({
  status,
  hasChanges,
}: {
  status: AgentStatus
  hasChanges?: boolean
}) {
  const map: Record<AgentStatus, { label: string; className: string }> = {
    published: { label: "Live", className: "bg-green-100 text-green-800 border-green-200" },
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200" },
    paused: { label: "Paused", className: "bg-amber-100 text-amber-800 border-amber-200" },
  }
  const { label, className } = map[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shadow-sm",
          className,
        )}
      >
        {label}
      </span>
      {hasChanges && (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
          Unpublished edits
        </span>
      )}
    </span>
  )
}

export function SessionStatusBadge({ status, dryRun }: { status: SessionStatus; dryRun?: boolean }) {
  const map: Record<SessionStatus, { label: string; className: string }> = {
    succeeded: { label: "Succeeded", className: "bg-green-100 text-green-800 border-green-200" },
    error: { label: "Failed", className: "bg-red-100 text-red-800 border-red-200" },
    running: { label: "Running", className: "bg-blue-100 text-blue-800 border-blue-200" },
    waiting_approval: { label: "Waiting for approval", className: "bg-amber-100 text-amber-800 border-amber-200" },
  }
  const { label, className } = map[status] ?? { label: status, className: "bg-muted text-muted-foreground border-muted" }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          className,
        )}
      >
        {label}
      </span>
      {dryRun && (
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          Test run
        </span>
      )}
    </span>
  )
}

export const TRIGGER_LABEL: Record<TriggerType, string> = {
  schedule: "On a schedule",
  channel: "When a message arrives",
  manual: "Manually",
  agent: "Agent call",
}

/** Matches the overlay pattern the connectors page established. */
export function Modal({
  open,
  onClose,
  children,
  width = "max-w-md",
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  width?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl",
          width,
        )}
      >
        {children}
      </div>
    </div>
  )
}
