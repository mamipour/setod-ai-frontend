"use client"

/**
 * Shared connector card components used on the Connectors page.
 *
 * Extracted from app/(dashboard)/connectors/page.tsx (R1 refactor).
 */
import { useState } from "react"
import Image from "next/image"
import { Check, ChevronDown, X } from "lucide-react"
import { connectors, API_BASE, type Connector } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { catalogueFor, timeAgo } from "./catalogue"

// ── ConnectorIcon ──────────────────────────────────────────────────────────────

export function ConnectorIcon({ iconSrc, icon, size = 32 }: { iconSrc?: string; icon: string; size?: number }) {
  if (iconSrc) return (
    <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-white p-1 dark:ring-1 dark:ring-white/10" style={{ width: size + 8, height: size + 8 }}>
      <Image src={iconSrc} alt="" width={size} height={size} />
    </span>
  )
  return <span className="text-2xl">{icon}</span>
}

// ── StatusDot ──────────────────────────────────────────────────────────────────

export function StatusDot({ status }: { status: Connector["status"] }) {
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

// ── ConnectedCard ──────────────────────────────────────────────────────────────

export function ConnectedCard({ connector, orgId, onDelete, onUpdated }: {
  connector: Connector
  orgId: string
  onDelete: () => void
  onUpdated: () => void
}) {
  const meta = catalogueFor(connector)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [twilioPrompt, setTwilioPrompt] = useState(false)
  const [twilioTo, setTwilioTo] = useState("")
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null)
  const [rotatingSecret, setRotatingSecret] = useState(false)
  const [copied, setCopied] = useState(false)
  const [webhookExpanded, setWebhookExpanded] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const isUnhealthy = connector.status === "error" || connector.status === "revoked"
  const isWebhook = connector.type === "webhook"
  const webhookUrl = isWebhook ? `${API_BASE}/hooks/${connector.id}` : null
  // Connectors that support in-place token refresh via OAuth
  const canReconnect = connector.type === "instagram" || connector.type === "google_business_profile"

  function handleReconnect() {
    setReconnecting(true)
    if (connector.type === "instagram") {
      connectors.startInstagramOAuth(orgId, connector.id)
    } else if (connector.type === "google_business_profile") {
      window.location.href = connectors.gbpOAuthStartUrl(orgId, connector.id)
    }
  }

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

  async function handleCopyUrl() {
    if (!webhookUrl) return
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRotateSecret() {
    if (!confirm("Rotate the signing secret? The old secret stops working immediately.")) return
    setRotatingSecret(true)
    try {
      const res = await connectors.regenWebhookSecret(connector.id, orgId)
      setWebhookSecret(res.secret)
    } catch {
      // ignore
    } finally {
      setRotatingSecret(false)
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
          <div className="flex min-w-0 items-center gap-3">
            <ConnectorIcon iconSrc={meta?.iconSrc} icon={meta?.icon ?? "🔌"} />
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {connector.type === "webhook"
                  ? connector.name
                  : connector.name.replace(/^[^·]+·\s*/, "")}
              </CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusDot status={connector.status} />
                <span className="text-xs text-muted-foreground">· Updated {timeAgo(connector.updated_at)}</span>
              </div>
            </div>
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

          {/* Webhook — expandable details */}
          {isWebhook && webhookExpanded && (
            <div className="space-y-2">
              <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Endpoint URL</p>
                <p className="text-xs font-mono break-all select-all">{webhookUrl}</p>
              </div>
              <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Signing secret</p>
                {webhookSecret
                  ? <p className="text-xs font-mono break-all select-all">{webhookSecret}</p>
                  : <p className="text-xs text-muted-foreground italic">Hidden — rotate to reveal a new one</p>
                }
              </div>
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <p className={cn("flex items-center gap-1 text-xs", testResult.ok ? "text-green-600" : "text-red-600")}>
              {testResult.ok ? <Check className="size-3" /> : <X className="size-3" />}
              {testResult.detail}
            </p>
          )}

          {/* Delete error */}
          {deleteError && (
            <p className="text-xs text-red-600">{deleteError}</p>
          )}

          <div className="flex gap-2 flex-wrap">
            {isWebhook ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setWebhookExpanded(v => !v)} className="text-xs gap-1">
                  {webhookExpanded ? <><ChevronDown className="size-3" /> Hide</> : <><ChevronDown className="size-3 -rotate-90" /> Show details</>}
                </Button>
                {webhookExpanded && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleCopyUrl} className="text-xs gap-1.5">
                      {copied ? <><Check className="size-3" /> Copied</> : "Copy URL"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRotateSecret} disabled={rotatingSecret} className="text-xs">
                      {rotatingSecret ? "Rotating…" : "Rotate secret"}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={handleTest} disabled={testing} className="text-xs">
                {testing ? "Testing…" : "Test"}
              </Button>
            )}
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
            {canReconnect && (
              <Button
                size="sm"
                variant="outline"
                disabled={reconnecting}
                className="text-xs"
                onClick={handleReconnect}
              >
                {reconnecting ? "Redirecting…" : "Reconnect"}
              </Button>
            )}
            <UpdateCredentialsModal connector={connector} orgId={orgId} onUpdated={onUpdated} />
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}
              className="text-xs text-destructive hover:text-destructive">
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Twilio  -  prompt for destination number */}
      {twilioPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={() => setTwilioPrompt(false)} />
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

// ── UpdateCredentialsModal ─────────────────────────────────────────────────────

type CredFields = {
  label: string
  key: string
  type?: "text" | "password" | "textarea"
  placeholder?: string
}[]

const CRED_FIELDS: Partial<Record<string, CredFields>> = {
  gmail: [
    { label: "Gmail address", key: "email", placeholder: "you@gmail.com" },
    { label: "App Password", key: "app_password", type: "password", placeholder: "xxxx xxxx xxxx xxxx" },
  ],
  telegram_bot: [
    { label: "Bot Token", key: "bot_token", type: "password", placeholder: "12345:ABC..." },
  ],
  twilio: [
    { label: "Account SID", key: "account_sid", placeholder: "ACxxxx" },
    { label: "Auth Token", key: "auth_token", type: "password", placeholder: "Auth token" },
    { label: "Phone Number", key: "phone_number", placeholder: "+16135550100" },
  ],
  whatsapp: [
    { label: "Phone Number ID", key: "phone_number_id", placeholder: "From WhatsApp Business dashboard" },
    { label: "Access Token", key: "access_token", type: "password", placeholder: "EAAxx..." },
    { label: "Verify Token", key: "verify_token", placeholder: "Your chosen verify token" },
  ],
  shopify: [
    { label: "Shop Domain", key: "shop_domain", placeholder: "mystore.myshopify.com" },
    { label: "Access Token", key: "access_token", type: "password", placeholder: "shpat_..." },
  ],
  hubspot: [{ label: "API Token", key: "api_token", type: "password", placeholder: "pat-na1-..." }],
  pipedrive: [{ label: "API Token", key: "api_token", type: "password", placeholder: "Pipedrive API token" }],
  airtable: [{ label: "Personal Access Token", key: "api_token", type: "password", placeholder: "pat..." }],
  calendly: [{ label: "API Token", key: "api_token", type: "password", placeholder: "Calendly personal token" }],
  slack_webhook: [{ label: "Webhook URL", key: "webhook_url", placeholder: "https://hooks.slack.com/..." }],
}

export function UpdateCredentialsModal({ connector, orgId, onUpdated }: {
  connector: Connector; orgId: string; onUpdated: () => void
}) {
  const fields = CRED_FIELDS[connector.type]
  if (!fields) return null

  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function reset() { setValues({}); setError(null); setSuccess(false) }

  async function handleSave() {
    setLoading(true); setError(null)
    // Require at least one field to be filled
    if (Object.values(values).every(v => !v.trim())) {
      setError("Enter at least one new value to update."); setLoading(false); return
    }
    const credentials: Record<string, unknown> = {}
    for (const f of fields ?? []) {
      if (values[f.key]?.trim()) credentials[f.key] = values[f.key].trim()
    }
    try {
      await connectors.updateCredentials(connector.id, orgId, credentials)
      setSuccess(true)
      onUpdated()
      setTimeout(() => { setOpen(false); reset() }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { reset(); setOpen(true) }}>
        Reconnect
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={() => { setOpen(false); reset() }} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-base">Reconnect</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {connector.name} — leave a field blank to keep the current value.
              </p>
            </div>
            <div className="space-y-3">
              {fields.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <textarea
                      className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder={f.placeholder}
                      value={values[f.key] ?? ""}
                      onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      type={f.type ?? "text"}
                      placeholder={f.placeholder}
                      value={values[f.key] ?? ""}
                      onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      className="text-sm"
                      onKeyDown={e => e.key === "Enter" && !loading && handleSave()}
                    />
                  )}
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && <p className="text-xs text-green-600 flex items-center gap-1"><Check className="size-3" /> Updated successfully.</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setOpen(false); reset() }} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading} className="text-xs">
                {loading ? "Validating…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
