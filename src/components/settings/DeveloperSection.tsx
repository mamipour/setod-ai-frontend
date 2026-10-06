"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { mcp, type ApiToken, type McpInfo } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const EXPIRY = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "never", label: "Never" },
] as const

type Snippet = "claude" | "cursor" | "other"

function snippet(kind: Snippet, url: string, token: string) {
  const secret = token || "<token>"
  if (kind === "claude") {
    return `claude mcp add --transport http setod ${url || "<url>"} --header "Authorization: Bearer ${secret}"`
  }
  if (kind === "cursor") {
    return JSON.stringify(
      {
        mcpServers: {
          setod: {
            url: url || "<url>",
            headers: { Authorization: `Bearer ${secret}` },
          },
        },
      },
      null,
      2,
    )
  }
  return `${url || "<url>"}\nAuthorization: Bearer ${secret}`
}

function when(value: string | null, empty: string) {
  if (!value) return empty
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty
  return date.toLocaleString()
}

export function DeveloperSection({ orgId, isOwner }: { orgId: string; isOwner: boolean }) {
  const [info, setInfo] = useState<McpInfo | null>(null)
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Snippet>("claude")
  const [copied, setCopied] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [scope, setScope] = useState<"read" | "write">("read")
  const [expiry, setExpiry] = useState("90")
  const [creating, setCreating] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    Promise.all([mcp.info(orgId), mcp.listTokens(orgId)])
      .then(([nextInfo, nextTokens]) => {
        if (cancelled) return
        setInfo(nextInfo)
        setTokens(nextTokens)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load developer settings")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgId])

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    window.setTimeout(() => setCopied((current) => (current === label ? null : current)), 2000)
  }

  async function create() {
    setCreating(true)
    setError(null)
    try {
      const created = await mcp.createToken({
        org_id: orgId,
        name: name.trim(),
        scope,
        expires_in_days: expiry === "never" ? null : Number(expiry),
      })
      setRevealed(created.token)
      setTokens((rows) => [created, ...rows])
      setName("")
      setScope("read")
      setExpiry("90")
      setFormOpen(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create token")
    } finally {
      setCreating(false)
    }
  }

  async function revoke(row: ApiToken) {
    if (!confirm(`Revoke "${row.name}"? Editors using it will stop working.`)) return
    setError(null)
    try {
      await mcp.revokeToken(row.id)
      setTokens((rows) => rows.filter((item) => item.id !== row.id))
      if (revealed && revealed.includes(row.token_prefix)) setRevealed(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to revoke token")
    }
  }

  if (!orgId) return null

  const enabled = info?.enabled === true
  const url = info?.url ?? ""
  const shown = revealed ?? ""

  return (
    <div className="py-6 space-y-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Connect Claude Code or Cursor to this workspace.{" "}
        <Link href="/help/editor" className="underline underline-offset-4 hover:text-foreground">
          How it works
        </Link>
      </p>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && info && !enabled && (
        <p className="text-sm text-muted-foreground">The MCP server is not enabled on this deployment.</p>
      )}

      {!loading && enabled && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-muted px-2 py-1 text-xs">{url || "No public URL configured"}</code>
            {url && (
              <Button type="button" variant="outline" size="sm" onClick={() => copy("url", url)}>
                {copied === "url" ? "Copied" : "Copy"}
              </Button>
            )}
          </div>

          <div>
            <div className="flex gap-1">
              {(["claude", "cursor", "other"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs",
                    tab === id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {id === "claude" ? "Claude Code" : id === "cursor" ? "Cursor" : "Other"}
                </button>
              ))}
            </div>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{snippet(tab, url, shown)}</pre>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => copy("snippet", snippet(tab, url, shown))}>
              {copied === "snippet" ? "Copied" : "Copy"}
            </Button>
            {tab === "cursor" && (
              <p className="mt-2 text-xs text-muted-foreground">Paste into ~/.cursor/mcp.json.</p>
            )}
          </div>

          {revealed && (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">This is the only time the token is shown.</p>
              <code className="mt-2 block break-all font-mono text-xs">{revealed}</code>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => copy("token", revealed)}>
                {copied === "token" ? "Copied" : "Copy"}
              </Button>
            </div>
          )}

          {!formOpen ? (
            <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
              New token
            </Button>
          ) : (
            <div className="grid max-w-md gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="token-name">Name</Label>
                <Input id="token-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Claude on my laptop" />
              </div>
              <div className="grid gap-1.5">
                <Label>Scope</Label>
                <Select value={scope} onValueChange={(value) => value && setScope(value as "read" | "write")}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read</SelectItem>
                    {isOwner && <SelectItem value="write">Write</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Expires</Label>
                <Select value={expiry} onValueChange={(value) => value && setExpiry(value)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={creating || !name.trim()} onClick={create}>
                  {creating ? "Creating…" : "Create token"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {tokens.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Prefix</th>
                <th className="py-2 pr-3 font-medium">Scope</th>
                <th className="py-2 pr-3 font-medium">Last used</th>
                <th className="py-2 pr-3 font-medium">Expires</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tokens.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.token_prefix}</td>
                  <td className="py-2 pr-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{row.scope}</span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{when(row.last_used_at, "Never")}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{when(row.expires_at, "Never")}</td>
                  <td className="py-2 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => revoke(row)}>
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
