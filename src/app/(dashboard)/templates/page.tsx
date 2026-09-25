"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarClock, Hand, Lock, MessageSquare, X } from "lucide-react"
import { agents, type AgentTemplate, type SchedulePreset } from "@/lib/api"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentIcon, connectorIconSrc, Modal } from "@/components/agents/shared"
import { CONNECTOR_LABEL, CreateAgentFlow } from "@/components/agents/CreateAgentFlow"
import { cn } from "@/lib/utils"

// The Templates page is a curated catalogue: the platform team adds entries in
// `app/core/agents/templates/`, the user picks one. There is no editing here on purpose -
// every field is adjustable on the setup step that opens when they choose "Use template".
// A community marketplace (publishing, ratings) is a later phase and will replace this page.

export default function TemplatesPage() {
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [presets, setPresets] = useState<SchedulePreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<AgentTemplate | null>(null)
  const [using, setUsing] = useState<AgentTemplate | null>(null)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    Promise.all([agents.templates(orgId), agents.schedulePresets()])
      .then(([t, p]) => {
        if (cancelled) return
        setTemplates(t)
        setPresets(p)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load templates")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgId])

  // The API returns templates already ordered by category, so a stable group-by keeps the
  // server's order without re-sorting here.
  const groups = useMemo(() => {
    const out: { category: string; items: AgentTemplate[] }[] = []
    for (const t of templates) {
      const last = out[out.length - 1]
      if (last && last.category === t.category) last.items.push(t)
      else out.push({ category: t.category, items: [t] })
    }
    return out
  }, [templates])

  const presetLabel = (key: string | null) => presets.find((p) => p.key === key)?.label

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ready-made agents for common jobs. Pick one, connect the accounts it needs, and
          adjust anything you like before it runs.
        </p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        groups.map(({ category, items }) => (
          <section key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{category}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <TemplateCard
                  key={t.key}
                  template={t}
                  scheduleLabel={presetLabel(t.schedule_preset)}
                  onView={() => setViewing(t)}
                  onUse={() => setUsing(t)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {!loading && !error && (
        <p className="text-xs text-muted-foreground">
          Need something else?{" "}
          <Link href="/agents" className="underline underline-offset-2">
            Start from scratch
          </Link>{" "}
          on the Agents page and write your own instructions.
        </p>
      )}

      {viewing && (
        <TemplateDetails
          template={viewing}
          scheduleLabel={presetLabel(viewing.schedule_preset)}
          onClose={() => setViewing(null)}
          onUse={() => {
            setUsing(viewing)
            setViewing(null)
          }}
        />
      )}

      {using && orgId && (
        <CreateAgentFlow
          orgId={orgId}
          initialTemplateKey={using.key}
          onClose={() => setUsing(null)}
        />
      )}
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────────

function TriggerLine({ template, scheduleLabel }: { template: AgentTemplate; scheduleLabel?: string }) {
  const Icon =
    template.trigger_type === "schedule" ? CalendarClock
    : template.trigger_type === "channel" ? MessageSquare
    : Hand
  const text =
    template.trigger_type === "schedule" ? (scheduleLabel ?? "On a schedule")
    : template.trigger_type === "channel" ? "When a message arrives"
    : "Only when you ask"
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      {text}
    </span>
  )
}

function ConnectorIcons({ template }: { template: AgentTemplate }) {
  const all = [...template.required_connectors, ...template.optional_connectors]
  if (all.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1">
      {all.map((type) => {
        const src = connectorIconSrc(type)
        const missing = template.missing_connectors.includes(type)
        const optional = template.optional_connectors.includes(type)
        return (
          <span
            key={type}
            title={`${CONNECTOR_LABEL[type]}${optional ? " (optional)" : ""}${missing ? " - not connected" : ""}`}
            className={cn(
              "flex size-6 items-center justify-center rounded-md border bg-white dark:ring-1 dark:ring-white/10",
              (missing || optional) && "opacity-50",
            )}
          >
            {src ? <Image src={src} alt="" width={14} height={14} /> : null}
          </span>
        )
      })}
    </span>
  )
}

function TemplateCard({
  template: t,
  scheduleLabel,
  onView,
  onUse,
}: {
  template: AgentTemplate
  scheduleLabel?: string
  onView: () => void
  onUse: () => void
}) {
  const blocked = !t.ready
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/30">
      <button type="button" onClick={onView} className="flex flex-1 flex-col items-start text-left">
        <div className="flex w-full items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <AgentIcon icon={t.icon} className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{t.name}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.tagline}</p>
          </div>
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <div className="flex min-w-0 items-center gap-3">
          <ConnectorIcons template={t} />
          <TriggerLine template={t} scheduleLabel={scheduleLabel} />
        </div>
        <Button
          size="sm"
          variant={blocked ? "outline" : "default"}
          className="h-7 shrink-0 text-xs"
          onClick={onUse}
          title={
            blocked
              ? `Connect ${t.missing_connectors.map((c) => CONNECTOR_LABEL[c]).join(", ")} during setup`
              : undefined
          }
        >
          {blocked && <Lock className="size-3" />}
          Use template
        </Button>
      </div>
    </div>
  )
}

// ── Details ────────────────────────────────────────────────────────────────────

function TemplateDetails({
  template: t,
  scheduleLabel,
  onClose,
  onUse,
}: {
  template: AgentTemplate
  scheduleLabel?: string
  onClose: () => void
  onUse: () => void
}) {
  return (
    <Modal open onClose={onClose} width="max-w-2xl">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <AgentIcon icon={t.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t.category}</p>
            <h2 className="text-lg font-semibold leading-tight">{t.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {t.description && <p className="text-sm leading-relaxed">{t.description}</p>}

        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="font-medium">Runs</p>
            <div className="mt-1.5">
              <TriggerLine template={t} scheduleLabel={scheduleLabel} />
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">Accounts</p>
            {t.required_connectors.length + t.optional_connectors.length === 0 ? (
              <p className="mt-1.5 text-muted-foreground">Only an AI brain - nothing else to connect.</p>
            ) : (
              <ul className="mt-1.5 space-y-1 text-muted-foreground">
                {t.required_connectors.map((c) => (
                  <li key={c} className="flex items-center gap-1.5">
                    {t.missing_connectors.includes(c)
                      ? <Lock className="size-3 text-amber-600" />
                      : <span className="text-green-700">✓</span>}
                    {CONNECTOR_LABEL[c]}
                  </li>
                ))}
                {t.optional_connectors.map((c) => (
                  <li key={c} className="flex items-center gap-1.5">
                    <span className="w-3 text-center">·</span>
                    {CONNECTOR_LABEL[c]} <span className="text-muted-foreground/60">optional</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium">Instructions it starts with</p>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {t.instructions}
          </pre>
          <p className="text-xs text-muted-foreground">
            You can edit every line of this before the agent is created.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>
          <Button size="sm" onClick={onUse} className="text-xs">
            Use template <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </Modal>
  )
}
