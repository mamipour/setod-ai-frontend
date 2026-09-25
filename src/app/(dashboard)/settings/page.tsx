"use client"

import { Suspense, useEffect, useState } from "react"
import Image from "next/image"
import { BellRing, Shield } from "lucide-react"
import { connectors as connectorsApi, workspace, type Connector, type ConnectorType, type WebSearchSettings } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ── Status dot ────────────────────────────────────────────────────────────────

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

// ── LLM provider card ─────────────────────────────────────────────────────────

const LLM_META: Record<"openai" | "anthropic", { label: string; iconSrc: string; keyPlaceholder: string }> = {
  openai:    { label: "OpenAI",    iconSrc: "/openai.svg",    keyPlaceholder: "sk-…" },
  anthropic: { label: "Anthropic", iconSrc: "/anthropic.svg", keyPlaceholder: "sk-ant-…" },
}

function LLMProviderCard({
  provider,
  orgId,
  existing,
  onSaved,
}: {
  provider: "openai" | "anthropic"
  orgId: string
  existing: Connector | undefined
  onSaved: () => void
}) {
  const meta = LLM_META[provider]
  const [editing, setEditing] = useState(false)
  const [key, setKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isConnected = !!existing && existing.status !== "revoked"

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      if (existing) {
        await connectorsApi.updateLLMKey(existing.id, orgId, key.trim())
      } else {
        await connectorsApi.createLLM(orgId, meta.label, provider, key.trim())
      }
      setEditing(false); setKey(""); setTestResult(null)
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!existing) return
    setTesting(true); setTestResult(null)
    try {
      setTestResult(await connectorsApi.test(existing.id, orgId))
    } catch (e: unknown) {
      setTestResult({ ok: false, detail: e instanceof Error ? e.message : "Test failed" })
    } finally {
      setTesting(false)
    }
  }

  async function handleRemove() {
    if (!existing) return
    setDeleting(true); setError(null)
    try {
      await connectorsApi.delete(existing.id, orgId)
      setTestResult(null)
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Image src={meta.iconSrc} alt={meta.label} width={32} height={32} className="shrink-0" />
          <div>
            <CardTitle className="text-sm font-semibold leading-tight">{meta.label}</CardTitle>
            <CardDescription className="text-xs">
              {isConnected
                ? existing!.status === "active" ? "Active" : "Connected"
                : "Not connected"}
            </CardDescription>
          </div>
          {isConnected && (
            <span className="ml-auto">
              <StatusDot status={existing!.status} />
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {testResult && (
          <p className={cn("text-xs", testResult.ok ? "text-green-700" : "text-destructive")}>
            {testResult.ok ? "✓" : "✗"} {testResult.detail}
          </p>
        )}
        {error && !editing && <p className="text-xs text-destructive">{error}</p>}
        {!editing ? (
          <div className="flex items-center gap-2 mt-auto flex-wrap">
            {isConnected ? (
              <>
                <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || deleting}>
                  {testing ? "Testing…" : "Test"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(true); setTestResult(null) }} disabled={deleting}>
                  Replace key
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleRemove} disabled={deleting}>
                  {deleting ? "Removing…" : "Remove"}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Add API key
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`llm-key-${provider}`} className="text-xs">API key</Label>
            <Input
              id={`llm-key-${provider}`}
              type="password"
              placeholder={meta.keyPlaceholder}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="font-mono text-xs h-8"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || !key.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setKey(""); setError(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Notify card ───────────────────────────────────────────────────────────────

function NotifyCard({ orgId, connectors: allConnectors }: { orgId: string; connectors: Connector[] }) {
  const tgClients = allConnectors.filter((c) => c.type === "telegram_client" && c.status === "active")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    workspace.getNotify(orgId)
      .then((s) => setSelectedId(s.telegram_connector_id))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  async function handleSave(id: string | null) {
    setSaving(true); setError(null); setTestResult(null)
    try {
      const updated = await workspace.updateNotify(orgId, { telegram_connector_id: id })
      setSelectedId(updated.telegram_connector_id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const result = await workspace.testNotify(orgId)
      setTestResult(result)
    } catch (e: unknown) {
      setTestResult({ ok: false, detail: e instanceof Error ? e.message : "Test failed" })
    } finally {
      setTesting(false)
    }
  }

  const selected = tgClients.find((c) => c.id === selectedId)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <BellRing className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold leading-tight">Notifications</CardTitle>
            <CardDescription className="text-xs">
              {loading
                ? "Loading…"
                : selected
                  ? `Telegram + email (${selected.name})`
                  : "Email only (owner's login address)"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {testResult && (
          <p className={cn("text-xs", testResult.ok ? "text-green-700" : "text-destructive")}>
            {testResult.ok ? "✓" : "✗"} {testResult.detail}
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        {tgClients.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Telegram channel (optional)</Label>
            <select
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              value={selectedId ?? ""}
              disabled={loading || saving}
              onChange={(e) => handleSave(e.target.value || null)}
            >
              <option value="">None — email only</option>
              {tgClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {tgClients.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add a <strong>Telegram Account</strong> connector to also receive alerts on Telegram.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Email always goes to your login address as a fallback.
        </p>

        <div className="flex items-center gap-2 mt-auto">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || loading}>
            {testing ? "Sending…" : "Send test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Retention card ────────────────────────────────────────────────────────────

const RETENTION_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Keep forever", value: null },
  { label: "1 year",  value: 365 },
  { label: "6 months", value: 180 },
  { label: "90 days",  value: 90 },
  { label: "30 days",  value: 30 },
  { label: "7 days",   value: 7 },
]

function RetentionCard({ orgId }: { orgId: string }) {
  const [retentionDays, setRetentionDays] = useState<number | null>(null)
  const [scrubOnly, setScrubOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    workspace.getRetention(orgId)
      .then((r) => { setRetentionDays(r.data_retention_days); setScrubOnly(r.scrub_content_only) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  async function save() {
    setSaving(true); setError(null)
    try {
      const r = await workspace.updateRetention(orgId, {
        data_retention_days: retentionDays,
        scrub_content_only: scrubOnly,
      })
      setRetentionDays(r.data_retention_days)
      setScrubOnly(r.scrub_content_only)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Shield className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold leading-tight">Data Retention</CardTitle>
            <CardDescription className="text-xs">
              Automatically delete or scrub run history older than a set period.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {loading ? (
          <div className="h-8 animate-pulse rounded bg-muted" />
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Keep run history for</label>
              <select
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={retentionDays ?? "forever"}
                onChange={(e) => setRetentionDays(e.target.value === "forever" ? null : Number(e.target.value))}
              >
                {RETENTION_OPTIONS.map((o) => (
                  <option key={String(o.value)} value={o.value ?? "forever"}>{o.label}</option>
                ))}
              </select>
            </div>

            {retentionDays !== null && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded"
                  checked={scrubOnly}
                  onChange={(e) => setScrubOnly(e.target.checked)}
                />
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Scrub message content only</span>{" "}
                  — keep session metadata (token counts, cost, status) but delete the message text.
                  Good for GDPR compliance while preserving usage data.
                </span>
              </label>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <Button size="sm" variant="outline" onClick={save} disabled={saving}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save policy"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Tavily card ───────────────────────────────────────────────────────────────

function TavilyCard({ orgId }: { orgId: string }) {
  const [settings, setSettings] = useState<WebSearchSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [key, setKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    workspace.getWebSearch(orgId)
      .then(setSettings)
      .catch(() => setSettings({ provider: "duckduckgo", tavily_key_set: false }))
      .finally(() => setLoading(false))
  }, [orgId])

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const updated = await workspace.updateWebSearch(orgId, {
        provider: key.trim() ? "tavily" : "duckduckgo",
        tavily_api_key: key.trim() || "",
      })
      setSettings(updated); setEditing(false); setKey(""); setTestResult(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true); setError(null)
    try {
      const updated = await workspace.updateWebSearch(orgId, { provider: "duckduckgo", tavily_api_key: "" })
      setSettings(updated); setEditing(false); setTestResult(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const result = await workspace.testWebSearch(orgId)
      setTestResult(result)
    } catch (e: unknown) {
      setTestResult({ ok: false, detail: e instanceof Error ? e.message : "Test failed" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Image src="/tavily.svg" alt="Tavily" width={32} height={32} className="shrink-0" />
          <div>
            <CardTitle className="text-sm font-semibold leading-tight">Tavily</CardTitle>
            <CardDescription className="text-xs">
              {loading
                ? "Loading…"
                : settings?.provider === "tavily"
                ? "Active — reliable search built for AI agents"
                : "Not configured — using DuckDuckGo (rate-limited)"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {testResult && (
          <p className={cn("text-xs", testResult.ok ? "text-green-700" : "text-destructive")}>
            {testResult.ok ? "✓" : "✗"} {testResult.detail}
          </p>
        )}
        {!editing ? (
          <div className="flex items-center gap-2 mt-auto">
            {settings?.tavily_key_set ? (
              <>
                <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || loading}>
                  {testing ? "Testing…" : "Test"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={loading}>
                  Replace key
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleRemove} disabled={saving}>
                  Remove
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={loading}>
                Add Tavily key
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="tavily-key" className="text-xs">Tavily API key</Label>
            <Input
              id="tavily-key"
              type="password"
              placeholder="tvly-…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="font-mono text-xs h-8"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || !key.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setKey("") }}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Key is encrypted at rest and never returned to the browser.{" "}
              <a href="https://app.tavily.com/home" target="_blank" rel="noopener noreferrer" className="underline">
                Get a key ↗
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SettingsPageInner() {
  const { user, loading: userLoading } = useUser()
  const { activeOrg } = useActiveOrg()
  const [connectors, setConnectors] = useState<Connector[]>([])

  const orgId = activeOrg?.id ?? ""

  function fetchConnectors() {
    if (!orgId) return
    connectorsApi.list(orgId).then(setConnectors).catch(() => {})
  }

  useEffect(() => {
    fetchConnectors()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  if (userLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Workspace-wide preferences shared across all agents.
        </p>
      </div>

      {/* AI Models */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">AI Models</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            LLM API keys — shared across all agents in this workspace.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(["openai", "anthropic"] as const).map((p) => (
            <LLMProviderCard
              key={p}
              provider={p}
              orgId={orgId}
              existing={connectors.find((c) => c.type === (p as ConnectorType))}
              onSaved={fetchConnectors}
            />
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="space-y-4 border-t pt-8">
        <div>
          <h2 className="text-base font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Where to send alerts for agent failures, budget limits, and approval requests.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NotifyCard orgId={orgId} connectors={connectors} />
        </div>
      </section>

      {/* Search */}
      <section className="space-y-4 border-t pt-8">
        <div>
          <h2 className="text-base font-semibold">Web Search</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Search provider used when an agent has web search enabled.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TavilyCard orgId={orgId} />
        </div>
      </section>

      {/* Data & Privacy */}
      <section className="space-y-4 border-t pt-8">
        <div>
          <h2 className="text-base font-semibold">Data & Privacy</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control how long run history is kept and whether message content is retained.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <RetentionCard orgId={orgId} />
        </div>
      </section>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageInner />
    </Suspense>
  )
}
