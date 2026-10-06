"use client"

/**
 * Connector setup modals — one per connector type.
 *
 * Extracted from app/(dashboard)/connectors/page.tsx (R1 refactor).
 * Each modal manages its own open/closed state so callers just render
 * the component and pass an onSaved callback.
 */
import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"
import { connectors, API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ── Connector setup modals ─────────────────────────────────────────────────────

export function GmailConnectorModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Connect Gmail</h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X aria-hidden className="size-4" /></button>
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

export function WebhookModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
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
    if (!name.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await connectors.createWebhook(orgId, name.trim())
      setResult({ webhook_url: res.webhook_url, secret: res.secret })
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() { setOpen(false); setResult(null); setError(null); setName("") }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setResult(null); setOpen(true) }}>
        Connect
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Inbound Webhook</h2>
            {!result ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Creates a unique URL your services can POST to. Any POST triggers agents
                  that listen on this webhook. Payloads are delivered as JSON — the agent sees
                  the full body as its trigger message.
                </p>
                <div className="space-y-1">
                  <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Shopify orders, Contact form, Stripe events"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && name.trim() && handleCreate()}
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Used to identify this webhook on the connectors page.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optionally send an <code className="font-mono bg-muted px-1 rounded">X-Hub-Signature-256</code> header
                  (GitHub-style HMAC-SHA256) to authenticate requests.
                </p>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
                  <Button size="sm" onClick={handleCreate} disabled={loading || !name.trim()}>
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

export function SlackWebhookModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [name, setName] = useState("Slack Webhook")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() { setOpen(false); setWebhookUrl(""); setName("Slack Webhook"); setError(null) }

  async function handleSave() {
    if (!webhookUrl.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createSlackWebhook(orgId, webhookUrl.trim(), name.trim() || "Slack Webhook")
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect Slack Webhook</h2>
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

export function GoogleSheetsModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
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

// ── Instagram OAuth button ────────────────────────────────────────────────────

export function InstagramOAuthButton({ orgId }: { orgId: string }) {
  const [starting, setStarting] = useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs"
      disabled={starting}
      onClick={() => {
        setStarting(true)
        connectors.startInstagramOAuth(orgId)
      }}
    >
      {starting ? "Opening…" : "Connect"}
    </Button>
  )
}

// ── HubSpot modal ─────────────────────────────────────────────────────────────

export function HubSpotModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [apiToken, setApiToken] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() { setOpen(false); setApiToken(""); setName(""); setError(null) }

  async function handleSave() {
    if (!apiToken.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createHubSpot(orgId, apiToken.trim(), name.trim() || undefined)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect HubSpot</h2>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>In HubSpot, go to <strong>Settings → Integrations → Private apps</strong>.</li>
              <li>Create a Private App with scopes: <code className="bg-muted px-1 rounded text-[10px]">crm.objects.contacts.read/write</code>, <code className="bg-muted px-1 rounded text-[10px]">crm.objects.deals.read/write</code>, <code className="bg-muted px-1 rounded text-[10px]">crm.objects.notes.read/write</code>.</li>
              <li>Copy the generated token and paste it below.</li>
            </ol>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Private App Token</Label>
                <Input
                  type="password"
                  placeholder="pat-na1-xxxxxxxx-…"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  placeholder="HubSpot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading || !apiToken.trim()}>
                {loading ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Pipedrive modal ───────────────────────────────────────────────────────────

export function PipedriveModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [apiToken, setApiToken] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() { setOpen(false); setApiToken(""); setName(""); setError(null) }

  async function handleSave() {
    if (!apiToken.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createPipedrive(orgId, apiToken.trim(), name.trim() || undefined)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect Pipedrive</h2>
            <p className="text-sm text-muted-foreground">
              In Pipedrive, go to <strong>Settings → Personal preferences → API</strong> and copy your API token.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">API Token</Label>
                <Input
                  type="password"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  placeholder="Pipedrive"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading || !apiToken.trim()}>
                {loading ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Notion modal ─────────────────────────────────────────────────────────────


// ── Airtable modal ────────────────────────────────────────────────────────────

export function AirtableModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [apiToken, setApiToken] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() { setOpen(false); setApiToken(""); setName(""); setError(null) }

  async function handleSave() {
    if (!apiToken.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createAirtable(orgId, apiToken.trim(), name.trim() || undefined)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect Airtable</h2>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" className="underline">airtable.com/create/tokens</a> and click <strong>Create token</strong>.</li>
              <li>Add scopes: <code className="bg-muted px-1 rounded text-[10px]">schema.bases:read</code>, <code className="bg-muted px-1 rounded text-[10px]">data.records:read</code>, <code className="bg-muted px-1 rounded text-[10px]">data.records:write</code>.</li>
              <li>Under <strong>Access</strong>, add the bases you want the agent to access.</li>
              <li>Copy the token and paste it below.</li>
            </ol>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Personal Access Token</Label>
                <Input
                  type="password"
                  placeholder="pat…"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  placeholder="Airtable"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading || !apiToken.trim()}>
                {loading ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Shopify modal ─────────────────────────────────────────────────────────────

export function ShopifyModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [shopDomain, setShopDomain] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() { setOpen(false); setShopDomain(""); setAccessToken(""); setName(""); setError(null) }

  async function handleSave() {
    if (!shopDomain.trim() || !accessToken.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createShopify(orgId, shopDomain.trim(), accessToken.trim(), name.trim() || undefined)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect Shopify</h2>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>In your Shopify admin, go to <strong>Settings → Apps → Develop apps</strong>.</li>
              <li>Click <strong>Create an app</strong>, give it a name.</li>
              <li>Under <strong>Configuration → Admin API access scopes</strong>, add: <code className="bg-muted px-1 rounded text-[10px]">read_orders</code>, <code className="bg-muted px-1 rounded text-[10px]">read_customers</code>, <code className="bg-muted px-1 rounded text-[10px]">read_products</code>, <code className="bg-muted px-1 rounded text-[10px]">write_orders</code>.</li>
              <li>Click <strong>Install app</strong>, then copy the <strong>Admin API access token</strong>.</li>
            </ol>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Store domain</Label>
                <Input
                  placeholder="mystore.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Admin API access token</Label>
                <Input
                  type="password"
                  placeholder="shpat_…"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  placeholder="Shopify"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading || !shopDomain.trim() || !accessToken.trim()}>
                {loading ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Calendly modal ────────────────────────────────────────────────────────────

export function CalendlyModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [apiToken, setApiToken] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() { setOpen(false); setApiToken(""); setName(""); setError(null) }

  async function handleSave() {
    if (!apiToken.trim()) return
    setLoading(true); setError(null)
    try {
      await connectors.createCalendly(orgId, apiToken.trim(), name.trim() || undefined)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold">Connect Calendly</h2>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noopener noreferrer" className="underline">calendly.com/integrations/api_webhooks</a>.</li>
              <li>Under <strong>Personal Access Tokens</strong>, click <strong>Generate new token</strong>.</li>
              <li>Enable scopes: <code className="bg-muted px-1 rounded text-[10px]">event_types:read</code>, <code className="bg-muted px-1 rounded text-[10px]">scheduled_events:read/write</code>, <code className="bg-muted px-1 rounded text-[10px]">invitees:write</code>, <code className="bg-muted px-1 rounded text-[10px]">scheduling_links:write</code>.</li>
              <li>Copy the token (shown once) and paste it below.</li>
            </ol>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Personal Access Token</Label>
                <Input
                  type="password"
                  placeholder="eyJ…"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Name (optional)</Label>
                <Input
                  placeholder="Calendly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading || !apiToken.trim()}>
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

export function WhatsAppModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
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

export function TwilioModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">Connect Twilio</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === "form" ? "Step 1 of 2  -  Account credentials" : "Step 2 of 2  -  Confirm & save"}
                </p>
              </div>
              <button type="button" aria-label="Close" onClick={handleClose} className="rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X aria-hidden className="size-4" /></button>
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

export function TelegramClientModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-xl p-6 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">Connect Telegram Account</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{stepLabel[step]}</p>
              </div>
              <button type="button" aria-label="Close" onClick={handleClose} className="rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X aria-hidden className="size-4" /></button>
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

export function TelegramBotModal({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default border-0 bg-black/40 p-0" onClick={handleClose} />
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
              <button type="button" aria-label="Close" onClick={handleClose} className="rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X aria-hidden className="size-4" /></button>
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
                  <Input type="password" placeholder="7123456789:AAF…" value={token}
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

export function McpConnectorModal({
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/40 p-4">
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

export function McpOauthAppModal({
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/40 p-4">
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

