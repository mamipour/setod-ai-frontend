"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Search, X } from "lucide-react"
import { connectors, type Connector, type ConnectorType } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { CATALOGUE, CATEGORIES, CATEGORY_LABEL, type CatalogueEntry } from "@/components/connectors/catalogue"
import { ConnectedCard } from "@/components/connectors/ConnectorCard"
import { AvailableCard } from "@/components/connectors/AvailableCard"

// ── Page ──────────────────────────────────────────────────────────────────────

function ConnectorsPageInner() {
  const { loading: userLoading } = useUser()
  const { activeOrg } = useActiveOrg()
  const searchParams = useSearchParams()
  const [list, setList] = useState<Connector[]>([])
  const [fetching, setFetching] = useState(true)
  const [justConnected, setJustConnected] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<CatalogueEntry["category"] | "All">("All")

  const orgId = activeOrg?.id ?? ""

  useEffect(() => {
    const connected = searchParams.get("connected")
    const reconnected = searchParams.get("reconnected")
    if (connected) {
      setJustConnected(connected)
      window.history.replaceState(null, "", "/connectors")
    } else if (reconnected) {
      setJustConnected(`__reconnected__${reconnected}`)
      window.history.replaceState(null, "", "/connectors")
      fetchList()
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

  // Exclude LLM keys (they live in Settings → AI Models) and the built-in Tables connector
  // (always present, nothing to configure here — it's managed from the Tables page).
  const HIDDEN_TYPES: ConnectorType[] = ["openai", "anthropic", "tables"]
  const connectedList = list.filter((c) => !HIDDEN_TYPES.includes(c.type))

  // Health summary counts
  const activeCount  = connectedList.filter((c) => c.status === "active").length
  const errorCount   = connectedList.filter((c) => c.status === "error" || c.status === "revoked").length
  const pendingCount = connectedList.filter((c) => c.status === "pending_auth").length

  // Filter catalogue by search + category
  const filteredCatalogue = CATALOGUE.filter((c) => {
    const matchesSearch = !search || c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === "All" || c.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const visibleCategories = activeCategory === "All"
    ? CATEGORIES.filter((cat) => filteredCatalogue.some((c) => c.category === cat))
    : [activeCategory]

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Connectors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your accounts and services once — every agent in your workspace can use them.
        </p>
      </div>

      {/* Success banner */}
      {justConnected && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <Check className="size-4 shrink-0" />
          <span>
            {justConnected?.startsWith("__reconnected__")
              ? `${justConnected.replace("__reconnected__", "")} reconnected successfully.`
              : justConnected === "mcp" ? "MCP server connected successfully."
              : `${justConnected} connected successfully.`}
          </span>
          <button className="ml-auto text-green-600 hover:text-green-800" onClick={() => setJustConnected(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── Connected ──────────────────────────────────────────────────────── */}
      <section>
        {/* Header + health summary */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h2 className="text-base font-semibold">Connected</h2>
          {connectedList.length > 0 && (
            <>
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                {connectedList.length}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-1">
                {activeCount > 0  && <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-green-500 inline-block" />{activeCount} active</span>}
                {errorCount > 0   && <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-red-500 inline-block" />{errorCount} error</span>}
                {pendingCount > 0 && <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-yellow-400 inline-block" />{pendingCount} pending</span>}
              </div>
            </>
          )}
        </div>

        {fetching && connectedList.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedList.map((c) => (
              <ConnectedCard key={c.id} connector={c} orgId={orgId} onDelete={fetchList} onUpdated={fetchList} />
            ))}
          </div>
        )}
      </section>

      {/* ── Add connector ──────────────────────────────────────────────────── */}
      <section className="space-y-5 border-t pt-8">
        <div>
          <h2 className="text-base font-semibold">Add connector</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect services your agents can send messages, read data, or trigger actions through.
          </p>
        </div>

        {/* Search + category chips */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveCategory("All") }}
              placeholder="Search connectors…"
              className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSearch("") }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  activeCategory === cat && !search
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Connector grid — grouped by category or flat if searching */}
        {filteredCatalogue.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No connectors match "<strong>{search}</strong>"</p>
          </div>
        ) : search ? (
          // Flat grid when searching — no category headers
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalogue.map((c) => (
              <AvailableCard key={c.catalogKey ?? c.type} {...c} orgId={orgId}
                existingCount={list.filter((x) => x.type === c.type).length} onSaved={fetchList} />
            ))}
          </div>
        ) : (
          // Grouped by category
          <div className="space-y-6">
            {visibleCategories.map((cat) => {
              const items = filteredCatalogue.filter((c) => c.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">
                    {CATEGORY_LABEL[cat]}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((c) => (
                      <AvailableCard key={c.catalogKey ?? c.type} {...c} orgId={orgId}
                        existingCount={list.filter((x) => x.type === c.type).length} onSaved={fetchList} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
