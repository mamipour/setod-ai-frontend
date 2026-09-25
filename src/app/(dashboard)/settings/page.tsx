"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { BellRing, Check as CheckIcon, Monitor, Moon, Pencil, Shield, Sun, X as XIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { connectors as connectorsApi, workspace, type Connector, type ConnectorType, type WebSearchSettings } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Connector["status"] }) {
  const map: Record<Connector["status"], { label: string; cls: string }> = {
    active:       { label: "Active",  cls: "bg-green-50 text-green-700 ring-green-600/20" },
    error:        { label: "Error",   cls: "bg-red-50 text-red-700 ring-red-600/20" },
    pending_auth: { label: "Pending", cls: "bg-yellow-50 text-yellow-700 ring-yellow-600/20" },
    revoked:      { label: "Revoked", cls: "bg-gray-50 text-gray-600 ring-gray-500/20" },
  }
  const { label, cls } = map[status]
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", cls)}>
      {label}
    </span>
  )
}

// ── Row wrapper: label on left, control on right ──────────────────────────────

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:gap-8">
      <div className="sm:w-64 shrink-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-base font-semibold mb-0">{title}</h2>
      {/* divide-y puts a separator between rows but never before the first */}
      <div className="divide-y">{children}</div>
    </section>
  )
}

// ── LLM Provider row ──────────────────────────────────────────────────────────

const LLM_META: Record<"openai" | "anthropic", { label: string; iconSrc: string; keyPlaceholder: string; desc: string }> = {
  openai:    { label: "OpenAI",    iconSrc: "/openai.svg",    keyPlaceholder: "sk-…",     desc: "GPT-4o, o3, and other OpenAI models" },
  anthropic: { label: "Anthropic", iconSrc: "/anthropic.svg", keyPlaceholder: "sk-ant-…", desc: "Claude Sonnet, Opus, and Haiku" },
}

function LLMRow({
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
      if (existing) await connectorsApi.updateLLMKey(existing.id, orgId, key.trim())
      else await connectorsApi.createLLM(orgId, meta.label, provider, key.trim())
      setEditing(false); setKey(""); setTestResult(null); onSaved()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save") }
    finally { setSaving(false) }
  }

  async function handleTest() {
    if (!existing) return
    setTesting(true); setTestResult(null)
    try { setTestResult(await connectorsApi.test(existing.id, orgId)) }
    catch (e: unknown) { setTestResult({ ok: false, detail: e instanceof Error ? e.message : "Test failed" }) }
    finally { setTesting(false) }
  }

  async function handleRemove() {
    if (!existing) return
    setDeleting(true); setError(null)
    try { await connectorsApi.delete(existing.id, orgId); setTestResult(null); onSaved() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to remove") }
    finally { setDeleting(false) }
  }

  return (
    <SettingRow
      label={meta.label}
      description={meta.desc}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Image src={meta.iconSrc} alt={meta.label} width={28} height={28} className="shrink-0 rounded dark:invert" />
          {isConnected
            ? <StatusBadge status={existing!.status} />
            : <span className="text-xs text-muted-foreground">Not connected</span>}
        </div>

        {testResult && (
          <p className={cn("text-xs", testResult.ok ? "text-green-700" : "text-destructive")}>
            {testResult.ok ? "✓" : "✗"} {testResult.detail}
          </p>
        )}

        {editing ? (
          <div className="space-y-2 max-w-sm">
            <Label htmlFor={`llm-key-${provider}`} className="text-xs">API key</Label>
            <Input
              id={`llm-key-${provider}`}
              type="password"
              placeholder={meta.keyPlaceholder}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
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
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
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
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      </div>
    </SettingRow>
  )
}

// ── Notifications row ─────────────────────────────────────────────────────────

function NotificationsRow({ orgId, connectors: allConnectors }: { orgId: string; connectors: Connector[] }) {
  const tgClients = allConnectors.filter((c) => c.type === "telegram_client" && c.status === "active")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    workspace.getNotify(orgId).then((s) => setSelectedId(s.telegram_connector_id)).catch(() => {}).finally(() => setLoading(false))
  }, [orgId])

  async function handleSave(id: string | null) {
    setSaving(true); setError(null); setTestResult(null)
    try { const u = await workspace.updateNotify(orgId, { telegram_connector_id: id }); setSelectedId(u.telegram_connector_id) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save") }
    finally { setSaving(false) }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try { setTestResult(await workspace.testNotify(orgId)) }
    catch (e: unknown) { setTestResult({ ok: false, detail: e instanceof Error ? e.message : "Test failed" }) }
    finally { setTesting(false) }
  }

  const selected = tgClients.find((c) => c.id === selectedId)

  return (
    <SettingRow label="Alerts channel" description="Where to send agent failure, budget, and approval alerts. Email is always the fallback.">
      <div className="space-y-3 max-w-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BellRing className="size-3.5 shrink-0" />
          {loading ? "Loading…" : selected ? `Email + Telegram (${selected.name})` : "Email only (owner's login address)"}
        </div>

        {tgClients.length > 0 ? (
          <div className="space-y-1">
            <Label className="text-xs">Telegram channel (optional)</Label>
            <select
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              value={selectedId ?? ""}
              disabled={loading || saving}
              onChange={(e) => handleSave(e.target.value || null)}
            >
              <option value="">None — email only</option>
              {tgClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add a <strong>Telegram Account</strong> connector to also receive alerts on Telegram.
          </p>
        )}

        {testResult && (
          <p className={cn("text-xs", testResult.ok ? "text-green-700" : "text-destructive")}>
            {testResult.ok ? "✓" : "✗"} {testResult.detail}
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || loading}>
          {testing ? "Sending…" : "Send test alert"}
        </Button>
      </div>
    </SettingRow>
  )
}

// ── Web Search row ────────────────────────────────────────────────────────────

function WebSearchRow({ orgId }: { orgId: string }) {
  const [settings, setSettings] = useState<WebSearchSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [key, setKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    workspace.getWebSearch(orgId).then(setSettings).catch(() => setSettings({ provider: "duckduckgo", tavily_key_set: false })).finally(() => setLoading(false))
  }, [orgId])

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const u = await workspace.updateWebSearch(orgId, { provider: key.trim() ? "tavily" : "duckduckgo", tavily_api_key: key.trim() || "" })
      setSettings(u); setEditing(false); setKey(""); setTestResult(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save") }
    finally { setSaving(false) }
  }

  async function handleRemove() {
    setSaving(true); setError(null)
    try { const u = await workspace.updateWebSearch(orgId, { provider: "duckduckgo", tavily_api_key: "" }); setSettings(u); setEditing(false); setTestResult(null) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save") }
    finally { setSaving(false) }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try { setTestResult(await workspace.testWebSearch(orgId)) }
    catch (e: unknown) { setTestResult({ ok: false, detail: e instanceof Error ? e.message : "Test failed" }) }
    finally { setTesting(false) }
  }

  return (
    <SettingRow label="Tavily" description="AI-optimised search. Falls back to DuckDuckGo (rate-limited) when no key is set.">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 inline-flex items-center justify-center rounded-lg bg-white p-1 dark:ring-1 dark:ring-white/10">
            <Image src="/tavily.svg" alt="Tavily" width={24} height={24} />
          </span>
          {loading ? <span className="text-xs text-muted-foreground">Loading…</span>
            : settings?.provider === "tavily"
              ? <StatusBadge status="active" />
              : <span className="text-xs text-muted-foreground">Not configured — using DuckDuckGo</span>}
        </div>

        {testResult && (
          <p className={cn("text-xs", testResult.ok ? "text-green-700" : "text-destructive")}>
            {testResult.ok ? "✓" : "✗"} {testResult.detail}
          </p>
        )}

        {editing ? (
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="tavily-key" className="text-xs">Tavily API key</Label>
            <Input id="tavily-key" type="password" placeholder="tvly-…" value={key}
              onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="font-mono text-xs h-8" autoFocus />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Key is encrypted at rest.{" "}
              <a href="https://app.tavily.com/home" target="_blank" rel="noopener noreferrer" className="underline">Get a key ↗</a>
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || !key.trim()}>{saving ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setKey("") }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {settings?.tavily_key_set ? (
              <>
                <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || loading}>{testing ? "Testing…" : "Test"}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={loading}>Replace key</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleRemove} disabled={saving}>Remove</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={loading}>Add Tavily key</Button>
            )}
          </div>
        )}
      </div>
    </SettingRow>
  )
}

// ── Data retention row ────────────────────────────────────────────────────────

const RETENTION_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Keep forever", value: null },
  { label: "1 year",  value: 365 },
  { label: "6 months", value: 180 },
  { label: "90 days",  value: 90 },
  { label: "30 days",  value: 30 },
  { label: "7 days",   value: 7 },
]

function DataRetentionRow({ orgId }: { orgId: string }) {
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
      const r = await workspace.updateRetention(orgId, { data_retention_days: retentionDays, scrub_content_only: scrubOnly })
      setRetentionDays(r.data_retention_days); setScrubOnly(r.scrub_content_only)
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save") }
    finally { setSaving(false) }
  }

  return (
    <SettingRow label="Run history" description="Automatically delete or scrub session logs older than the set period. Useful for GDPR compliance.">
      {loading ? <div className="h-8 w-48 animate-pulse rounded bg-muted" /> : (
        <div className="space-y-3 max-w-xs">
          <div className="space-y-1">
            <Label className="text-xs">Keep run history for</Label>
            <select
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              value={retentionDays ?? "forever"}
              onChange={(e) => setRetentionDays(e.target.value === "forever" ? null : Number(e.target.value))}
            >
              {RETENTION_OPTIONS.map((o) => <option key={String(o.value)} value={o.value ?? "forever"}>{o.label}</option>)}
            </select>
          </div>

          {retentionDays !== null && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded" checked={scrubOnly} onChange={(e) => setScrubOnly(e.target.checked)} />
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Scrub content only</span>{" "}
                — keep metadata (costs, status) but delete message text.
              </span>
            </label>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save policy"}
          </Button>
        </div>
      )}
    </SettingRow>
  )
}

// ── Workspace name row ────────────────────────────────────────────────────────

function WorkspaceNameRow({ orgId }: { orgId: string }) {
  const { activeOrg, reload } = useActiveOrg()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(activeOrg?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (!editing) setName(activeOrg?.name ?? "") }, [activeOrg?.name, editing])

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === activeOrg?.name) { setEditing(false); return }
    setSaving(true); setError(null)
    try { await workspace.renameWorkspace(orgId, trimmed); await reload(); setEditing(false) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to rename") }
    finally { setSaving(false) }
  }

  return (
    <SettingRow label="Workspace name" description="Only owners can rename the workspace.">
      {editing ? (
        <div className="flex items-center gap-2 max-w-xs">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setName(activeOrg?.name ?? "") } }}
            className="h-8 text-sm" />
          <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={save} disabled={saving}>
            <CheckIcon className="size-4 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={() => { setEditing(false); setName(activeOrg?.name ?? "") }}>
            <XIcon className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{activeOrg?.name}</span>
          <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </SettingRow>
  )
}

// ── Side nav ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "ai-models",    label: "AI Models" },
  { id: "notifications", label: "Notifications" },
  { id: "web-search",   label: "Web Search" },
  { id: "data-privacy", label: "Data & Privacy" },
  { id: "workspace",    label: "Workspace" },
]

function SideNav({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav className="hidden lg:flex flex-col gap-0.5 w-44 shrink-0 sticky top-6 self-start">
      {NAV_ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={() => onSelect(item.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            active === item.id
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SettingsPageInner() {
  const { loading: userLoading } = useUser()
  const { activeOrg } = useActiveOrg()
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [activeSection, setActiveSection] = useState("ai-models")
  const suppressObserver = useRef(false)
  const orgId = activeOrg?.id ?? ""

  function fetchConnectors() {
    if (!orgId) return
    connectorsApi.list(orgId).then(setConnectors).catch(() => {})
  }

  useEffect(() => { fetchConnectors() }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track which section is in view for the side nav highlight.
  // Suppressed briefly after a click so the click wins over the scroll event.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (suppressObserver.current) return
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveSection(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    )
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  function handleNavSelect(id: string) {
    setActiveSection(id)
    suppressObserver.current = true
    setTimeout(() => { suppressObserver.current = false }, 800)
  }

  if (userLoading) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Workspace-wide configuration shared across all agents.</p>
      </div>

      <div className="flex gap-10">
        {/* Sticky side nav */}
        <SideNav active={activeSection} onSelect={handleNavSelect} />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-12">

          <Section id="ai-models" title="AI Models">
            <LLMRow provider="openai" orgId={orgId} existing={connectors.find((c) => c.type === "openai" as ConnectorType)} onSaved={fetchConnectors} />
            <LLMRow provider="anthropic" orgId={orgId} existing={connectors.find((c) => c.type === "anthropic" as ConnectorType)} onSaved={fetchConnectors} />
          </Section>

          <Section id="notifications" title="Notifications">
            <NotificationsRow orgId={orgId} connectors={connectors} />
          </Section>

          <Section id="web-search" title="Web Search">
            <WebSearchRow orgId={orgId} />
          </Section>

          <Section id="data-privacy" title="Data & Privacy">
            <DataRetentionRow orgId={orgId} />
          </Section>

          <Section id="workspace" title="Workspace">
            <WorkspaceNameRow orgId={orgId} />
          </Section>

        </div>
      </div>
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
