"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Check, Lock, X } from "lucide-react"
import { connectors, type Connector, type ConnectorType } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ── Connector catalogue ────────────────────────────────────────────────────────

interface CatalogueEntry {
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
  category: "Email" | "Messaging" | "SMS & Voice" | "Automation" | "MCP servers"
}

const CATALOGUE: CatalogueEntry[] = [
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
    label: "Slack",
    description: "Post messages to a Slack channel via an Incoming Webhook URL.",
    icon: "#",
    iconSrc: "/slack.svg",
    authMethod: "api_key",
    available: true,
    category: "Automation",
  },
  {
    type: "google_sheets",
    label: "Google Sheets",
    description: "Read and write spreadsheet data using a service account.",
    icon: "📊",
    iconSrc: "/google-sheet.svg",
    authMethod: "api_key",
    available: true,
    category: "Automation",
  },
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
    label: "Notion",
    description: "Read and update Notion pages and databases.",
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
    label: "Slack",
    description: "Read channels and post messages through Slack MCP.",
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

const CATEGORIES: CatalogueEntry["category"][] = ["Email", "Messaging", "SMS & Voice", "Automation", "MCP servers"]

const CATEGORY_LABEL: Record<CatalogueEntry["category"], string> = {
  "Email":        "Email",
  "Messaging":    "Messaging",
  "SMS & Voice":  "SMS & Voice",
  "Automation":   "Automation",
  "MCP servers":  "MCP servers",
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function catalogueFor(connector: Connector): CatalogueEntry | undefined {
  if (connector.type !== "mcp") {
    return CATALOGUE.find((c) => c.type === connector.type)
  }
  const branded = CATALOGUE.find((c) => {
    if (c.type !== "mcp" || !c.catalogKey || c.catalogKey === "custom") return false
    return connector.name === c.label || connector.name.startsWith(`${c.label} ·`)
  })
  return branded ?? CATALOGUE.find((c) => c.catalogKey === "custom")
}

function ConnectorIcon({ iconSrc, icon, size = 32 }: { iconSrc?: string; icon: string; size?: number }) {
  if (iconSrc) return <Image src={iconSrc} alt="" width={size} height={size} className="shrink-0" />
  return <span className="text-2xl">{icon}</span>
}

// ── Status indicator ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: Connector["status"] }) {
  const map: Record<Connector["status"], { label: string; dot: string; text: string }> = {
    active:       { label: "Active",  dot: "bg-green-500", text: "text-green-700" },
    error:        { label: "Error",   dot: "bg-red-500",   text: "text-red-700" },
    pending_auth: { label: "Pending", dot: "bg-yellow-500", text: "text-yellow-700" },
    revoked:      { label: "Revoked", dot: "bg-gray-400",  text: "text-gray-500" },
  }
  const { label, dot, text } = map[status]
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-medium", text)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  )
}

// ── Connected connector card ───────────────────────────────────────────────────

function ConnectedCard({ connector, orgId, onDelete }: {
  connector: Connector
  orgId: string
  onDelete: () => void
}) {
  const meta = catalogueFor(connector)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [twilioPrompt, setTwilioPrompt] = useState(false)
  const [twilioTo, setTwilioTo] = useState("")
  const isUnhealthy = connector.status === "error" || connector.status === "revoked"

  async function handleTest() {
    if (connector.type === "twilio") { setTwilioPrompt(true); return }
    setTesting(true); setTestResult(null)
    try {
      setTestResult(await connectors.test(connector.id, orgId))
    } catch {
      setTestResult({ ok: false, detail: "Request failed" })
    } finally {
      setTesting(false)
    }
  }

  async function handleTwilioSend() {
    if (!twilioTo.trim()) return
    setTwilioPrompt(false); setTesting(true); setTestResult(null)
    try {
      setTestResult(await connectors.twilioSendTestSms(connector.id, orgId, twilioTo.trim()))
    } catch {
      setTestResult({ ok: false, detail: "Request failed" })
    } finally {
      setTesting(false); setTwilioTo("")
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${connector.name}"?`)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await connectors.delete(connector.id, orgId)
      onDelete()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not remove this connector")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="relative">
      <Card
        className={cn(
          "flex min-h-[140px] flex-col bg-gradient-to-t from-primary/[0.03] to-card shadow-xs",
          isUnhealthy && "border-red-200 from-red-500/[0.04]",
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <ConnectorIcon iconSrc={meta?.iconSrc} icon={meta?.icon ?? "🔌"} />
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold truncate">
                  {connector.name.replace(/^[^·]+·\s*/, "")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated {timeAgo(connector.updated_at)}
                </p>
              </div>
            </div>
            <StatusDot status={connector.status} />
          </div>
        </CardHeader>

        <CardContent className="pt-0 flex flex-col gap-2 flex-1 justify-end">
          {/* Error / revoked banner */}
          {isUnhealthy && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {connector.status === "revoked"
                ? "Access was revoked  -  reconnect to restore."
                : "Connection error  -  test to diagnose."}
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <p
              className={cn(
                "flex items-center gap-1 text-xs",
                testResult.ok ? "text-green-600" : "text-red-600",
              )}
            >
              {testResult.ok ? <Check className="size-3" /> : <X className="size-3" />}
              {testResult.detail}
            </p>
          )}

          {/* Delete error (e.g. connector still in use by agents) */}
          {deleteError && (
            <p className="text-xs text-red-600">{deleteError}</p>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="text-xs">
              {testing ? "Testing…" : "Test"}
            </Button>
            {connector.type === "mcp" && (
              <Button
                size="sm"
                variant="outline"
                disabled={testing}
                className="text-xs"
                onClick={async () => {
                  setTesting(true); setTestResult(null)
                  try {
                    setTestResult(await connectors.resyncMcp(connector.id, orgId))
                  } catch {
                    setTestResult({ ok: false, detail: "Resync failed" })
                  } finally {
                    setTesting(false)
                  }
                }}
              >
                Re-sync
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}
              className="text-xs text-destructive hover:text-destructive">
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Twilio  -  prompt for destination number */}
      {twilioPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTwilioPrompt(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="font-semibold text-sm">Send test SMS</h2>
            <div className="space-y-1.5">
              <Label className="text-xs">Destination phone number</Label>
              <Input placeholder="+16135550100" value={twilioTo}
                onChange={(e) => setTwilioTo(e.target.value)} className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && twilioTo.trim() && handleTwilioSend()} />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setTwilioPrompt(false)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handleTwilioSend} disabled={!twilioTo.trim()} className="text-xs">Send SMS</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── LLM connector modal ───────────────────────────────────────────────────────
// ── Gmail connector modal ─────────────────────────────────────────────────────

function GmailConnectorModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [appPassword, setAppPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() { setEmail(""); setAppPassword(""); setError(null) }

  async function handleSave() {
    if (!email.trim() || !appPassword.trim()) { setError("Email and App Password are required"); return }
    setSaving(true); setError(null)
    try {
      await connectors.createGmail(orgId, email.trim(), appPassword.trim())
      setOpen(false); reset(); onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { reset(); setOpen(true) }}>
        Connect
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Connect Gmail</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>

            <div className="rounded-md bg-muted/60 border px-4 py-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">How to get an App Password</p>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                <span>⚠</span> 2-Step Verification must be enabled on your Google account.
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline text-foreground">myaccount.google.com/apppasswords</a></li>
                <li>Select <strong>Mail</strong> and your device, then click <strong>Generate</strong></li>
                <li>Copy the 16-character password and paste it below</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gmail address</Label>
                <Input
                  type="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">App Password</Label>
                <Input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={appPassword}
                  onChange={(e) => { setAppPassword(e.target.value); setError(null) }}
                  className="text-xs font-mono"
                />
                <p className="text-xs text-muted-foreground">The 16-character password generated from your Google Account settings.</p>
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !email.trim() || !appPassword.trim()} className="text-xs">
                {saving ? "Connecting…" : "Save connector"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Twilio modal ──────────────────────────────────────────────────────────────

type TwilioStep = "form" | "confirm"

// ── Webhook modal ─────────────────────────────────────────────────────────────

function WebhookModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ webhook_url: string; secret: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<"url" | "secret" | null>(null)

  function copy(val: string, kind: "url" | "secret") {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(kind)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  async function handleCreate() {
    setLoading(true); setError(null)
    try {
      const res = await connectors.createWebhook(orgId)
      setResult({ webhook_url: res.webhook_url, secret: res.secret })
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() { setOpen(false); setResult(null); setError(null) }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setResult(null); setOpen(true) }}>
        Connect
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Inbound Webhook</h2>
            {!result ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Creates a unique URL your services can POST to. Any POST triggers agents
                  that listen on this webhook. Payloads are delivered as JSON — the agent sees
                  the full body as its trigger message.
                </p>
                <p className="text-xs text-muted-foreground">
                  Optionally send an <code className="font-mono bg-muted px-1 rounded">X-Hub-Signature-256</code> header
                  (GitHub-style HMAC-SHA256) to authenticate requests.
                </p>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
                  <Button size="sm" onClick={handleCreate} disabled={loading}>
                    {loading ? "Creating…" : "Generate URL"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Copy these now — the secret is shown once and cannot be recovered.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Webhook URL</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs font-mono">{result.webhook_url}</code>
                      <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => copy(result.webhook_url, "url")}>
                        {copied === "url" ? <Check className="size-3" /> : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Signing secret</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs font-mono">{result.secret}</code>
                      <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => copy(result.secret, "secret")}>
                        {copied === "secret" ? <Check className="size-3" /> : "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={handleClose}>Done</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Slack webhook modal ───────────────────────────────────────────────────────

function SlackWebhookModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [name, setName] = useState("Slack")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() { setOpen(false); setWebhookUrl(""); setName("Slack"); setError(null) }

  async function handleSave() {
    if (!webhookUrl.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createSlackWebhook(orgId, webhookUrl.trim(), name.trim() || "Slack")
      handleClose(); onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to connect")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setError(null); setOpen(true) }}>
        Connect
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect Slack</h2>
            <p className="text-sm text-muted-foreground">
              In Slack, go to <strong>Apps → Incoming Webhooks</strong> and create one for the channel
              you want. Paste the webhook URL below — a test message is sent immediately to confirm.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Incoming Webhook URL</Label>
                <Input
                  placeholder="https://hooks.slack.com/services/…"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  placeholder="Slack"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading || !webhookUrl.trim()}>
                {loading ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Google Sheets modal ───────────────────────────────────────────────────────

function GoogleSheetsModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [saJson, setSaJson] = useState("")
  const [defaultSheet, setDefaultSheet] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() { setOpen(false); setSaJson(""); setDefaultSheet(""); setName(""); setError(null) }

  async function handleSave() {
    if (!saJson.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createSheets(orgId, saJson.trim(), name.trim() || undefined, defaultSheet.trim() || undefined)
      handleClose(); onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to connect")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setError(null); setOpen(true) }}>
        Connect
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect Google Sheets</h2>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>In Google Cloud Console, create a service account and generate a JSON key.</li>
              <li>After connecting, share your spreadsheets with the service-account email shown.</li>
            </ol>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Service account JSON</Label>
                <textarea
                  rows={6}
                  placeholder={'{\n  "type": "service_account",\n  "client_email": "…",\n  …\n}'}
                  value={saJson}
                  onChange={(e) => setSaJson(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default spreadsheet URL or ID (optional)</Label>
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  value={defaultSheet}
                  onChange={(e) => setDefaultSheet(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  placeholder="Google Sheets"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading || !saJson.trim()}>
                {loading ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── WhatsApp Business modal ───────────────────────────────────────────────────

function WhatsAppModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [verifyToken, setVerifyToken] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setOpen(false); setPhoneNumberId(""); setAccessToken(""); setVerifyToken(""); setName(""); setError(null)
  }

  async function handleSave() {
    if (!phoneNumberId.trim() || !accessToken.trim() || !verifyToken.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createWhatsApp(orgId, phoneNumberId.trim(), accessToken.trim(), verifyToken.trim(), name.trim() || undefined)
      handleClose(); onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to connect")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setError(null); setOpen(true) }}>
        Connect
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect WhatsApp Business</h2>
            <p className="text-sm text-muted-foreground">
              From <strong>Meta Business Manager → WhatsApp → API Setup</strong>, copy the
              Phone Number ID and generate a permanent system-user access token.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Phone Number ID</Label>
                <Input
                  placeholder="123456789012345"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Permanent access token</Label>
                <Input
                  type="password"
                  placeholder="EAAxxxxxxx…"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Verify token (you choose this)</Label>
                <Input
                  placeholder="my-verify-token"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Enter this same string in Meta's webhook config. Setod echoes it back to verify ownership.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  placeholder="WhatsApp Business"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading || !phoneNumberId.trim() || !accessToken.trim() || !verifyToken.trim()}>
                {loading ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Twilio modal ──────────────────────────────────────────────────────────────

function TwilioModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<TwilioStep>("form")
  const [accountSid, setAccountSid] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [friendlyName, setFriendlyName] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setStep("form"); setAccountSid(""); setAuthToken(""); setPhoneNumber("")
    setFriendlyName(""); setName(""); setError(null)
  }
  function handleClose() { setOpen(false); reset() }

  async function handleValidate() {
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await connectors.validateTwilio(accountSid.trim(), authToken.trim(), phoneNumber.trim())
      if (res.ok) {
        setFriendlyName(res.friendly_name)
        setName(`Twilio · ${phoneNumber.trim()}`)
        setStep("confirm")
      } else {
        setError(res.detail)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Validation failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      await connectors.createTwilio(orgId, accountSid.trim(), authToken.trim(), phoneNumber.trim(), name.trim())
      handleClose(); onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { reset(); setOpen(true) }}>
        Connect
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">Connect Twilio</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === "form" ? "Step 1 of 2  -  Account credentials" : "Step 2 of 2  -  Confirm & save"}
                </p>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>

            {step === "form" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Where to find these</p>
                  <p>Log in to <strong>console.twilio.com</strong> → Account Info on the dashboard.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account SID</Label>
                  <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={accountSid}
                    onChange={(e) => { setAccountSid(e.target.value); setError(null) }} className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Auth Token</Label>
                  <Input type="password" placeholder="••••••••••••••••••••••••••••••••" value={authToken}
                    onChange={(e) => { setAuthToken(e.target.value); setError(null) }} className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Twilio Phone Number</Label>
                  <Input placeholder="+16135550100" value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); setError(null) }} className="text-xs" />
                  <p className="text-xs text-muted-foreground">The number you purchased from Twilio that sends SMS.</p>
                </div>
                {error && <p className="flex items-center gap-1 text-xs text-red-600"><X className="size-3" /> {error}</p>}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={handleClose} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleValidate}
                    disabled={loading || !accountSid.trim() || !authToken.trim() || !phoneNumber.trim()} className="text-xs">
                    {loading ? "Validating…" : "Validate →"}
                  </Button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 space-y-1">
                  <p className="flex items-center gap-1 text-xs font-medium text-green-800"><Check className="size-3" /> Credentials verified</p>
                  <p className="text-xs text-green-700">{friendlyName} · {phoneNumber}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Connector label</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs" />
                </div>
                {error && <p className="flex items-center gap-1 text-xs text-red-600"><X className="size-3" /> {error}</p>}
                <div className="flex justify-between gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setStep("form"); setError(null) }} className="text-xs">← Back</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                    {saving ? "Saving…" : "Save connector"}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}

// ── Telegram Client (MTProto) modal ──────────────────────────────────────────

type TgClientStep = "phone" | "otp" | "twofa" | "confirm"

interface TgUserInfo { name: string; phone: string; username: string }

function TelegramClientModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<TgClientStep>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [userInfo, setUserInfo] = useState<TgUserInfo | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setStep("phone"); setPhone(""); setOtp(""); setPassword("")
    setSessionId(""); setUserInfo(null); setName(""); setError(null)
  }
  function handleClose() { setOpen(false); reset() }

  async function handleSendCode() {
    if (!phone.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await connectors.startTelegramClient(orgId, phone.trim())
      setSessionId(res.session_id)
      setStep("otp")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send code")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await connectors.verifyTelegramClient(sessionId, otp.trim())
      if (res.needs_2fa) {
        setStep("twofa")
      } else if (res.ok && res.user) {
        setUserInfo(res.user)
        setName(`Telegram · ${res.user.name}`)
        setStep("confirm")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify2FA() {
    if (!password.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await connectors.verifyTelegramClient(sessionId, undefined, password.trim())
      if (res.ok && res.user) {
        setUserInfo(res.user)
        setName(`Telegram · ${res.user.name}`)
        setStep("confirm")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Incorrect password")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!userInfo) return
    setSaving(true); setError(null)
    try {
      await connectors.saveTelegramClient(sessionId, name.trim(), orgId)
      handleClose(); onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const stepLabel: Record<TgClientStep, string> = {
    phone:   "Step 1 of 3  -  Phone number",
    otp:     "Step 2 of 3  -  Verification code",
    twofa:   "Step 3 of 3  -  Two-step verification",
    confirm: "Connected  -  confirm details",
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { reset(); setOpen(true) }}>
        Connect
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">Connect Telegram Account</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{stepLabel[step]}</p>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>

            {/* Step 1  -  phone */}
            {step === "phone" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Enter the phone number linked to your Telegram account. We'll send a verification code to your Telegram app.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone number</Label>
                  <Input
                    placeholder="+1 613 555 0100"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(null) }}
                    className="text-sm"
                    onKeyDown={(e) => e.key === "Enter" && phone.trim() && handleSendCode()}
                  />
                </div>
                {error && <p className="flex items-center gap-1 text-xs text-red-600"><X className="size-3" /> {error}</p>}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={handleClose} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleSendCode} disabled={loading || !phone.trim()} className="text-xs">
                    {loading ? "Sending…" : "Send code →"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2  -  OTP */}
            {step === "otp" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Check your Telegram app</p>
                  <p>Open Telegram on your phone  -  you should have a message from <strong>Telegram</strong> with a 5-digit code.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Verification code</Label>
                  <Input
                    placeholder="12345"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null) }}
                    className="text-sm tracking-widest font-mono"
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && otp.trim() && handleVerifyOtp()}
                  />
                </div>
                {error && <p className="flex items-center gap-1 text-xs text-red-600"><X className="size-3" /> {error}</p>}
                <div className="flex justify-between gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setStep("phone"); setOtp(""); setError(null) }} className="text-xs">← Back</Button>
                  <Button size="sm" onClick={handleVerifyOtp} disabled={loading || otp.length < 5} className="text-xs">
                    {loading ? "Verifying…" : "Verify →"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3  -  2FA */}
            {step === "twofa" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Two-step verification enabled</p>
                  <p>This account has a cloud password. Enter it to continue.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cloud password</Label>
                  <Input
                    type="password"
                    placeholder="Your Telegram cloud password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    className="text-sm"
                    onKeyDown={(e) => e.key === "Enter" && password.trim() && handleVerify2FA()}
                  />
                </div>
                {error && <p className="flex items-center gap-1 text-xs text-red-600"><X className="size-3" /> {error}</p>}
                <div className="flex justify-between gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setStep("otp"); setPassword(""); setError(null) }} className="text-xs">← Back</Button>
                  <Button size="sm" onClick={handleVerify2FA} disabled={loading || !password.trim()} className="text-xs">
                    {loading ? "Verifying…" : "Connect →"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4  -  confirm */}
            {step === "confirm" && userInfo && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 space-y-1">
                  <p className="flex items-center gap-1 text-xs font-medium text-green-800"><Check className="size-3" /> Account verified</p>
                  <p className="text-xs text-green-700">
                    {userInfo.name}
                    {userInfo.username ? ` (@${userInfo.username})` : ""}
                    {" · "}{userInfo.phone}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Connector label</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs" />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={handleClose} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                    {saving ? "Saving…" : "Save connector"}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}

// ── Telegram Bot modal ────────────────────────────────────────────────────────

type TgStep = "token" | "link" | "confirm"
interface BotInfo { username: string; first_name: string; id: number }
interface AdminInfo { chat_id: number; username: string; first_name: string }

function TelegramBotModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<TgStep>("token")
  const [token, setToken] = useState("")
  const [bot, setBot] = useState<BotInfo | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const offsetRef = useRef<number>(0)

  function reset() {
    setStep("token"); setToken(""); setBot(null); setTokenError(null)
    setAdmin(null); setName(""); setSaveError(null); stopPolling()
  }
  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }
  function handleClose() { stopPolling(); setOpen(false); reset() }

  async function handleValidateToken() {
    setValidating(true); setTokenError(null)
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`)
      const data = await resp.json()
      if (data.ok) {
        setBot(data.result)
        setName(`Telegram · @${data.result.username}`)
        const updResp = await fetch(`https://api.telegram.org/bot${token.trim()}/getUpdates?limit=1&offset=-1`)
        const updData = await updResp.json()
        const updates = updData.result ?? []
        offsetRef.current = updates.length > 0 ? updates[updates.length - 1].update_id + 1 : 0
        setStep("link")
        startPolling(token.trim())
      } else {
        setTokenError(data.description ?? "Invalid token")
      }
    } catch {
      setTokenError("Could not reach Telegram  -  check your connection")
    } finally {
      setValidating(false)
    }
  }

  function startPolling(tok: string) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${tok}/getUpdates?offset=${offsetRef.current}&timeout=0`)
        const data = await resp.json()
        const updates: { update_id: number; message?: { chat: { id: number; username?: string; first_name?: string } } }[] = data.result ?? []
        for (const upd of updates) {
          offsetRef.current = upd.update_id + 1
          if (upd.message) {
            const chat = upd.message.chat
            stopPolling()
            await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chat.id,
                text: "✅ Your Telegram account has been linked to the platform. You will receive agent notifications here.",
              }),
            })
            setAdmin({ chat_id: chat.id, username: chat.username ?? "", first_name: chat.first_name ?? "" })
            setStep("confirm")
            return
          }
        }
      } catch { /* keep polling */ }
    }, 2000)
  }

  async function handleSave() {
    if (!bot || !admin) return
    setSaving(true); setSaveError(null)
    try {
      await connectors.createTelegramBot(orgId, name.trim(), token.trim(), admin.chat_id, admin.username, admin.first_name)
      handleClose(); onSaved()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { reset(); setOpen(true) }}>
        Connect
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">Connect Telegram Bot</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === "token" && "Step 1 of 3  -  Bot token"}
                  {step === "link" && "Step 2 of 3  -  Link admin chat"}
                  {step === "confirm" && "Step 3 of 3  -  Confirm"}
                </p>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>

            {step === "token" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Create a bot via{" "}
                  <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline">@BotFather</a>
                  {" "}on Telegram, then paste its token here.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bot Token</Label>
                  <Input type="password" placeholder="7123456789:AAF..." value={token}
                    onChange={(e) => { setToken(e.target.value); setTokenError(null) }}
                    className="text-xs font-mono"
                    onKeyDown={(e) => e.key === "Enter" && token.trim() && handleValidateToken()} />
                  {tokenError && <p className="flex items-center gap-1 text-xs text-red-600"><X className="size-3" /> {tokenError}</p>}
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={handleClose} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleValidateToken} disabled={validating || !token.trim()} className="text-xs">
                    {validating ? "Checking…" : "Verify token →"}
                  </Button>
                </div>
              </div>
            )}

            {step === "link" && bot && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 text-center space-y-3">
                  <p className="text-xs text-muted-foreground">Open Telegram and send any message to your bot:</p>
                  <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer"
                    className="inline-block font-semibold text-primary underline text-sm">
                    @{bot.username}
                  </a>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    Waiting for message…
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { stopPolling(); setStep("token") }} className="text-xs w-full">
                  ← Back
                </Button>
              </div>
            )}

            {step === "confirm" && bot && admin && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-1">
                  <p className="flex items-center gap-1 text-xs font-medium text-green-800"><Check className="size-3" /> Chat linked</p>
                  <p className="text-xs text-green-700">
                    {admin.first_name}{admin.username ? ` (@${admin.username})` : ""}  -  chat ID {admin.chat_id}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Connector label</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs" />
                </div>
                {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={handleClose} className="text-xs">Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                    {saving ? "Saving…" : "Save connector"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── MCP connector modal ────────────────────────────────────────────────────────

function McpConnectorModal({
  orgId,
  catalogKey,
  label,
  defaultUrl,
  urlRequired,
  allowOauth,
  onSaved,
}: {
  orgId: string
  catalogKey: string
  label: string
  defaultUrl?: string
  urlRequired?: boolean
  allowOauth?: boolean
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [url, setUrl] = useState(defaultUrl ?? "")
  const [token, setToken] = useState("")
  const [probing, setProbing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [probeAuth, setProbeAuth] = useState<"none" | "bearer" | "oauth" | null>(null)
  const [toolCount, setToolCount] = useState<number | null>(null)
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [startingOauth, setStartingOauth] = useState(false)
  const [redirectUri, setRedirectUri] = useState("")

  function reset() {
    setName("")
    setUrl(defaultUrl ?? "")
    setToken("")
    setError(null)
    setProbeAuth(null)
    setToolCount(null)
    setClientId("")
    setClientSecret("")
    setStartingOauth(false)
  }

  async function handleProbe() {
    setError(null)
    setProbing(true)
    try {
      const result = await connectors.probeMcp(orgId, url.trim(), token.trim() || undefined)
      setProbeAuth(result.auth)
      setToolCount(result.tools?.length ?? null)
      if (result.auth === "oauth" && !token.trim()) {
        setError("This server wants OAuth. Use Sign in, or paste a token if you have one.")
        connectors.mcpCatalog().then((rows) => {
          const row = rows.find((r) => r.key === catalogKey)
          if (row?.redirect_uri) setRedirectUri(row.redirect_uri)
        }).catch(() => {})
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach that server")
      setProbeAuth(null)
      setToolCount(null)
    } finally {
      setProbing(false)
    }
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      await connectors.createMcp(orgId, {
        name: name.trim() || label,
        url: url.trim(),
        catalog_key: catalogKey,
        token: token.trim() || undefined,
      })
      setOpen(false)
      reset()
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this connector")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => setOpen(true)}>
        Connect
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Connect {label}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                HTTPS only. We freeze the tool list on save — re-sync later if the server adds tools.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={label} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Server URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                disabled={!!defaultUrl && !urlRequired}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bearer token (optional)</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste a token if the server uses one"
              />
            </div>
            {allowOauth && probeAuth === "oauth" && (
              <>
                {redirectUri && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Redirect URI to add on the OAuth app</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={redirectUri} className="font-mono text-xs" />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs shrink-0"
                        onClick={() => navigator.clipboard.writeText(redirectUri)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">OAuth client ID (if Sign in asks for it)</Label>
                  <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">OAuth client secret</Label>
                  <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
                </div>
              </>
            )}
            {toolCount !== null && (
              <p className="text-xs text-muted-foreground">Probe found {toolCount} tool{toolCount === 1 ? "" : "s"}.</p>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setOpen(false); reset() }}>
                Cancel
              </Button>
              <Button size="sm" variant="outline" className="text-xs" disabled={!url.trim() || probing} onClick={handleProbe}>
                {probing ? "Probing…" : "Probe"}
              </Button>
              {allowOauth && probeAuth === "oauth" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  disabled={startingOauth}
                  onClick={async () => {
                    setError(null)
                    setStartingOauth(true)
                    try {
                      const rows = await connectors.mcpCatalog()
                      const row = rows.find((r) => r.key === catalogKey)
                      if (row?.redirect_uri) setRedirectUri(row.redirect_uri)
                      const { redirect } = await connectors.startMcpOAuth(orgId, {
                        catalog_key: catalogKey,
                        url: url.trim(),
                        name: name.trim() || label,
                        client_id: clientId.trim() || undefined,
                        client_secret: clientSecret.trim() || undefined,
                      })
                      window.location.href = redirect
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Could not start sign-in")
                      setStartingOauth(false)
                    }
                  }}
                >
                  {startingOauth ? "Opening…" : "Sign in"}
                </Button>
              )}
              <Button
                size="sm"
                className="text-xs"
                disabled={saving || !url.trim() || (probeAuth === "oauth" && !token.trim())}
                onClick={handleSave}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── MCP OAuth (Slack / Notion / … need a pre-registered app) ───────────────────

function McpOauthAppModal({
  orgId,
  catalogKey,
  label,
  defaultUrl,
  buttonLabel,
}: {
  orgId: string
  catalogKey: string
  label: string
  defaultUrl?: string
  buttonLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [redirectUri, setRedirectUri] = useState("")
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    connectors.mcpCatalog().then((rows) => {
      const row = rows.find((r) => r.key === catalogKey)
      if (row?.redirect_uri) setRedirectUri(row.redirect_uri)
    }).catch(() => {})
  }, [open, catalogKey])

  async function start(withApp: boolean) {
    setError(null)
    setStarting(true)
    try {
      const { redirect } = await connectors.startMcpOAuth(orgId, {
        catalog_key: catalogKey,
        url: defaultUrl,
        name: label,
        client_id: withApp ? clientId.trim() : undefined,
        client_secret: withApp ? clientSecret.trim() : undefined,
      })
      window.location.href = redirect
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start sign-in")
      setStarting(false)
    }
  }

  async function onConnectClick() {
    setError(null)
    try {
      const rows = await connectors.mcpCatalog()
      const row = rows.find((r) => r.key === catalogKey)
      if (row?.redirect_uri) setRedirectUri(row.redirect_uri)
      // Slack has no DCR — collect the app credentials. Notion/Linear/Atlassian register themselves.
      if (!row?.oauth_ready && row?.needs_oauth_app) {
        setOpen(true)
        return
      }
      setStarting(true)
      const { redirect } = await connectors.startMcpOAuth(orgId, {
        catalog_key: catalogKey,
        url: defaultUrl,
        name: label,
      })
      window.location.href = redirect
      return
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start sign-in")
      setStarting(false)
    }
    setOpen(true)
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" disabled={starting && !open} onClick={onConnectClick}>
        {starting && !open ? "Opening…" : buttonLabel}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Connect {label}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {label} does not allow automatic app registration. Create an OAuth app with this
                provider, add the redirect URI below, then paste the client ID and secret.
                {catalogKey === "slack" && (
                  <>
                    {" "}Create an <strong>internal</strong> app at api.slack.com/apps (unlisted
                    apps cannot use Slack MCP). Turn on{" "}
                    <strong>Agents &amp; AI Apps → Model Context Protocol</strong>. Under
                    OAuth &amp; Permissions, add the redirect URI and the{" "}
                    <strong>User Token Scopes</strong> Slack MCP lists (chat, channels, search,
                    files, users, canvases).
                  </>
                )}
              </p>
            </div>
            {redirectUri && (
              <div className="space-y-1.5">
                <Label className="text-xs">Redirect URI to add on the app</Label>
                <div className="flex gap-2">
                  <Input readOnly value={redirectUri} className="font-mono text-xs" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0"
                    onClick={() => navigator.clipboard.writeText(redirectUri)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Client ID</Label>
              <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="From your OAuth app" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Client secret</Label>
              <Input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Required for Slack"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs"
                disabled={starting || !clientId.trim() || !clientSecret.trim()}
                onClick={() => start(true)}
              >
                {starting ? "Opening…" : "Sign in"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Available connector card ───────────────────────────────────────────────────

function AvailableCard({ type, catalogKey, label, description, icon, iconSrc, authMethod, defaultUrl, urlRequired, available, orgId, existingCount, onSaved }: CatalogueEntry & {
  orgId: string; existingCount: number; onSaved: () => void
}) {
  const buttonLabel = existingCount > 0 ? "Add another" : "Connect"

  function renderAction() {
    if (!available) return null
    if (type === "gmail") return <GmailConnectorModal orgId={orgId} onSaved={onSaved} />
    if (type === "telegram_bot") return <TelegramBotModal orgId={orgId} onSaved={onSaved} />
    if (type === "telegram_client") return <TelegramClientModal orgId={orgId} onSaved={onSaved} />
    if (type === "twilio") return <TwilioModal orgId={orgId} onSaved={onSaved} />
    if (type === "webhook") return <WebhookModal orgId={orgId} onSaved={onSaved} />
    if (type === "slack_webhook") return <SlackWebhookModal orgId={orgId} onSaved={onSaved} />
    if (type === "google_sheets") return <GoogleSheetsModal orgId={orgId} onSaved={onSaved} />
    if (type === "whatsapp") return <WhatsAppModal orgId={orgId} onSaved={onSaved} />
    if (type === "mcp" && authMethod === "mcp_oauth") return (
      <McpOauthAppModal
        orgId={orgId}
        catalogKey={catalogKey ?? "custom"}
        label={label}
        defaultUrl={defaultUrl}
        buttonLabel={buttonLabel}
      />
    )
    if (type === "mcp") return (
      <McpConnectorModal
        orgId={orgId}
        catalogKey={catalogKey ?? "custom"}
        label={label}
        defaultUrl={defaultUrl}
        urlRequired={urlRequired}
        allowOauth={catalogKey === "custom" || catalogKey === "linear"}
        onSaved={onSaved}
      />
    )
    return null
  }

  return (
    <Card className={cn("relative flex flex-col min-h-[120px]", !available && "opacity-55")}>
      {!available && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Lock className="size-3" /> Soon
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <ConnectorIcon iconSrc={iconSrc} icon={icon} />
          <div>
            <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            <CardDescription className="text-xs mt-0.5 leading-snug">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex items-end">
        {renderAction()}
      </CardContent>
    </Card>
  )
}

// ── LLM provider card ─────────────────────────────────────────────────────────
// ── Page ──────────────────────────────────────────────────────────────────────

function ConnectorsPageInner() {
  const { user, loading: userLoading } = useUser()
  const searchParams = useSearchParams()
  const [list, setList] = useState<Connector[]>([])
  const [fetching, setFetching] = useState(true)
  const [justConnected, setJustConnected] = useState<string | null>(null)

  const orgId = user?.organizations[0]?.id ?? ""

  useEffect(() => {
    const connected = searchParams.get("connected")
    if (connected) {
      setJustConnected(connected)
      window.history.replaceState(null, "", "/connectors")
    }
  }, [searchParams])

  async function fetchList() {
    if (!orgId) return
    setFetching(true)
    try { setList(await connectors.list(orgId)) }
    finally { setFetching(false) }
  }

  useEffect(() => { fetchList() }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (userLoading) return null

  const connectedByType = new Map(list.map((c) => [c.type, c]))

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Connectors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your accounts and services once  -  every agent in your workspace can use them.
        </p>
      </div>

      {/* Success banner */}
      {justConnected && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <Check className="size-4 shrink-0" />
          <span>
            {justConnected === "mcp" ? "MCP server" : justConnected} connected successfully.
          </span>
          <button
            className="ml-auto text-green-600 hover:text-green-800"
            onClick={() => setJustConnected(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── AI Models ──────────────────────────────────────────────────── */}
      {/* ── Connected ─────────────────────────────────────────────────────── */}
      {(() => {
        // LLM providers live in "Workspace integrations" — exclude them here.
        const LLM_TYPES: ConnectorType[] = ["openai", "anthropic"]
        const connectedList = list.filter((c) => !LLM_TYPES.includes(c.type))
        return (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold">Connected</h2>
              {connectedList.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                  {connectedList.length}
                </span>
              )}
            </div>

            {fetching && connectedList.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {[0, 1, 2].map((i) => (
                  <Card key={i} className="min-h-[140px]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-2.5 w-20" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 items-end pt-0">
                      <Skeleton className="h-7 w-24 rounded-md" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : connectedList.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">No connectors yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Connect your first service below to start building agents.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {connectedList.map((c) => (
                  <ConnectedCard key={c.id} connector={c} orgId={orgId} onDelete={fetchList} />
                ))}
              </div>
            )}
          </section>
        )
      })()}

      {/* ── Add connector ─────────────────────────────────────────────────── */}
      <section className="space-y-6 border-t pt-8">
        <div>
          <h2 className="text-base font-semibold">Add connector</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect services your agents can send messages, read data, or trigger actions through.
          </p>
        </div>
        {CATEGORIES.map((cat) => {
          const items = CATALOGUE.filter((c) => c.category === cat)
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">{CATEGORY_LABEL[cat]}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((c) => (
                  <AvailableCard
                    key={c.catalogKey ?? c.type} {...c} orgId={orgId}
                    existingCount={list.filter((x) => x.type === c.type).length}
                    onSaved={fetchList}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </section>

    </div>
  )
}

// useSearchParams needs a Suspense boundary, or the production build cannot prerender
// this route.
export default function ConnectorsPage() {
  return (
    <Suspense fallback={null}>
      <ConnectorsPageInner />
    </Suspense>
  )
}
