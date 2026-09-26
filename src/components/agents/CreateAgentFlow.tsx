"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Loader2, Plus, Shield, TriangleAlert, Lock } from "lucide-react"
import {
  agents,
  connectors as connectorsApi,
  type AgentTemplate,
  type Connector,
  type ConnectorType,
  type SchedulePreset,
  type TriggerType,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { AgentIcon, BrainPicker, connectorIconSrc, CONNECTOR_TOOLS, Modal } from "@/components/agents/shared"
import { cn } from "@/lib/utils"

// Deliberately not the raw connector type names. The user is choosing "an email account",
// not "a gmail connector".
export const CONNECTOR_LABEL: Record<ConnectorType, string> = {
  gmail: "Google account",
  telegram_bot: "Telegram bot",
  telegram_client: "Telegram account",
  twilio: "Text messaging",
  webhook: "Inbound webhook",
  slack_webhook: "Slack",
  google_sheets: "Google Sheets",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  openai: "OpenAI",
  anthropic: "Anthropic",
  mcp: "MCP server",
}

const BUDGETS = [1, 2, 5, 10]

type Step = "pick" | "setup"

interface Props {
  orgId: string
  onClose: () => void
  /** Skip the picker and open straight on this template's setup step (Templates page). */
  initialTemplateKey?: string
}

export function CreateAgentFlow({ orgId, onClose, initialTemplateKey }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("pick")
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [presets, setPresets] = useState<SchedulePreset[]>([])
  const [chosen, setChosen] = useState<AgentTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    Promise.all([agents.templates(orgId), connectorsApi.list(orgId), agents.schedulePresets()])
      .then(([t, c, p]) => {
        setTemplates(t)
        setConnectors(c)
        setPresets(p)
        // Preselected template: land on setup directly. An unknown key (template removed
        // since the page loaded) falls back to the picker rather than a blank form.
        const preset = initialTemplateKey ? t.find((x) => x.key === initialTemplateKey) : undefined
        if (preset) {
          setChosen(preset)
          setStep("setup")
        }
      })
      .finally(() => setLoading(false))
  }, [orgId, initialTemplateKey])

  function refreshConnectors() {
    connectorsApi.list(orgId).then(setConnectors)
    agents.templates(orgId).then(setTemplates)
  }

  return (
    <Modal open onClose={onClose} width="max-w-3xl">
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
        </div>
      ) : step === "pick" ? (
        <PickTemplate
          templates={templates}
          onPick={(t) => {
            setChosen(t)
            setStep("setup")
          }}
          onClose={onClose}
        />
      ) : step === "setup" && chosen !== null ? (
        <SetupAgent
          orgId={orgId}
          template={chosen}
          connectors={connectors}
          presets={presets}
          onBack={() => setStep("pick")}
          onConnectorsChanged={refreshConnectors}
          onCreated={(id) => {
            onClose()
            router.push(`/agents/${id}`)
          }}
        />
      ) : null}
    </Modal>
  )
}

// ── Step 1: pick a starting point ──────────────────────────────────────────────

function PickTemplate({
  templates,
  onPick,
  onClose,
}: {
  templates: AgentTemplate[]
  onPick: (t: AgentTemplate) => void
  onClose: () => void
}) {
  const scratch: AgentTemplate = {
    key: "",
    name: "Start from scratch",
    icon: "robot",
    tagline: "Write your own instructions and pick your own tools.",
    description: "",
    instructions: "",
    category: "",
    required_connectors: [],
    optional_connectors: [],
    trigger_type: "manual",
    schedule_preset: null,
    settings: {},
    default_tools: {}, // scratch: all tools on, user opts out
    missing_connectors: [],
    ready: true,
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">What should this agent do?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick something close to what you need. You can change every part of it afterwards.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[scratch, ...templates].map((t) => {
          const blocked = !t.ready && t.required_connectors.length > 0
          return (
            <button
              key={t.key || "scratch"}
              onClick={() => onPick(t)}
              disabled={blocked}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                blocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <div className="flex items-start gap-3">
                <AgentIcon icon={t.icon} className={cn("mt-0.5", blocked ? "text-muted-foreground/50" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.tagline}</p>
                  {t.required_connectors.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {blocked ? (
                        <>
                          <Lock className="size-3 text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-700">
                            Needs {t.required_connectors.map((c) => CONNECTOR_LABEL[c]).join(", ")}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-green-700">
                          ✓ Ready to use
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Step 2: review and connect ─────────────────────────────────────────────────

function SetupAgent({
  orgId,
  template,
  connectors,
  presets,
  onBack,
  onConnectorsChanged,
  onCreated,
}: {
  orgId: string
  template: AgentTemplate
  connectors: Connector[]
  presets: SchedulePreset[]
  onBack: () => void
  onConnectorsChanged: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState(template.name === "Start from scratch" ? "" : template.name)
  const [instructions, setInstructions] = useState(template.instructions)
  const [trigger, setTrigger] = useState<TriggerType>(template.trigger_type)
  const [channelConnectorId, setChannelConnectorId] = useState("")
  const [preset, setPreset] = useState(template.schedule_preset ?? "daily_9am")
  const [budget, setBudget] = useState(2)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const brains = connectors.filter((c) => c.type === "openai" || c.type === "anthropic")

  // Which accounts this agent will act through. The choice is derived rather than stored, so
  // an account connected in another tab is picked up without a state-syncing effect; `chosen`
  // holds only the overrides where the user disagreed with the default.
  const isScratch = template.key === ""
  const wanted = isScratch
    ? // Scratch: every tool connector type that has at least one active connection becomes optional.
      (["gmail", "telegram_bot", "telegram_client", "twilio", "whatsapp", "instagram", "slack_webhook", "google_sheets"] as ConnectorType[]).filter((t) =>
        connectors.some((c) => c.type === t && c.status === "active"),
      )
    : [...template.required_connectors, ...template.optional_connectors]
  const [chosen, setChosen] = useState<Record<string, string>>({})

  // Which tools are enabled per connector type. Initialised from template.default_tools;
  // falls back to all tools when a type has no template opinion (including scratch).
  const [toolSelections, setToolSelections] = useState<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {}
    for (const type of [...template.required_connectors, ...template.optional_connectors]) {
      const allTools = (CONNECTOR_TOOLS[type] ?? []).map((t) => t.name)
      result[type] = template.default_tools?.[type] ?? allTools
    }
    return result
  })
  // Tools that require approval before running — starts empty (opt-in)
  const [approvalSelections, setApprovalSelections] = useState<Record<string, string[]>>({})

  function allToolsForType(type: string): string[] {
    return (CONNECTOR_TOOLS[type] ?? []).map((t) => t.name)
  }

  function toggleTool(type: string, name: string, enabled: boolean) {
    setToolSelections((s) => ({
      ...s,
      [type]: enabled
        ? [...(s[type] ?? allToolsForType(type)), name]
        : (s[type] ?? allToolsForType(type)).filter((n) => n !== name),
    }))
    // If a tool is disabled, remove it from approval too
    if (!enabled) {
      setApprovalSelections((s) => ({ ...s, [type]: (s[type] ?? []).filter((n) => n !== name) }))
    }
  }

  function toggleApproval(type: string, name: string, requiresApproval: boolean) {
    setApprovalSelections((s) => ({
      ...s,
      [type]: requiresApproval
        ? [...(s[type] ?? []), name]
        : (s[type] ?? []).filter((n) => n !== name),
    }))
  }

  function firstActive(type: ConnectorType): string {
    return connectors.find((c) => c.type === type && c.status === "active")?.id ?? ""
  }

  const brainId = chosen.brain || brains[0]?.id || ""
  const picked = Object.fromEntries(
    wanted
      .map((type) => [
        type,
        // Scratch: user must explicitly enable each connector  -  no auto-selection.
        // Templates: auto-select first active connector when the user hasn't overridden.
        isScratch ? (chosen[type] ?? "") : (chosen[type] || firstActive(type)),
      ])
      .filter(([, id]) => id),
  ) as Record<string, string>

  const missingRequired = template.required_connectors.filter((t) => !picked[t])
  const channelConnectors = connectors.filter(
    (c) => (c.type === "telegram_bot" || c.type === "twilio" || c.type === "whatsapp" || c.type === "instagram") && c.status === "active",
  )
  const canCreate =
    name.trim() &&
    brainId &&
    missingRequired.length === 0 &&
    !saving &&
    (trigger !== "channel" || !!channelConnectorId)

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      const agent = await agents.create({
        org_id: orgId,
        name: name.trim(),
        icon: template.icon,
        instructions,
        template_key: template.key || null,
        model_connector_id: brainId,
        settings: { daily_token_budget: Math.round((budget / 3) * 1_000_000) },
      })

      for (const [type, connectorId] of Object.entries(picked)) {
        const allTools = allToolsForType(type)
        const enabled = toolSelections[type] ?? allTools
        const approval = approvalSelections[type] ?? []
        await agents.attachTool(agent.id, {
          connector_id: connectorId,
          // null means "all tools" — more future-proof than an exhaustive list.
          enabled_tools: enabled.length === allTools.length ? null : enabled,
          approval_tools: approval.length === 0 ? null : approval,
        })
      }

      if (trigger === "schedule") {
        await agents.createTrigger(agent.id, { type: "schedule", config: { preset } })
      } else if (trigger === "channel" && channelConnectorId) {
        await agents.createTrigger(agent.id, { type: "channel", config: { connector_id: channelConnectorId } })
      }

      onCreated(agent.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the agent")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button size="sm" variant="ghost" onClick={onBack} className="-ml-2 text-xs">
          <ArrowLeft className="size-3.5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Set up your agent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything here can be changed later. Nothing runs until you say so.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Missed Call Recovery"
          className="text-sm"
        />
      </div>

      {/* The model connector, presented as what it does rather than what it is. */}
      <div className="space-y-1.5">
        <Label className="text-xs">AI brain</Label>
        {brains.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <TriangleAlert className="mr-1.5 inline size-3.5" />
            You need an OpenAI or Anthropic key before an agent can think. Add one on the
            Connectors page, then come back.
          </div>
        ) : (
          <BrainPicker
            brains={brains}
            value={brainId}
            onChange={(id) => setChosen((c) => ({ ...c, brain: id }))}
          />
        )}
      </div>

      {wanted.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Accounts it can use</Label>
          <div className="space-y-2">
            {wanted.map((type) => (
              <ConnectorRow
                key={type}
                type={type}
                required={!isScratch && template.required_connectors.includes(type)}
                options={connectors.filter((c) => c.type === type && c.status === "active")}
                value={picked[type] ?? ""}
                onChange={(id) => setChosen((c) => ({ ...c, [type]: id }))}
                onConnect={onConnectorsChanged}
                enabledTools={toolSelections[type] ?? allToolsForType(type)}
                onToolToggle={(name, enabled) => toggleTool(type, name, enabled)}
                approvalTools={approvalSelections[type] ?? []}
                onApprovalToggle={(name, req) => toggleApproval(type, name, req)}
                onToggle={
                  isScratch
                    ? (on) => {
                        setChosen((c) => ({ ...c, [type]: on ? firstActive(type) : "" }))
                        // Initialise tool selection when connector is first enabled.
                        if (on && !toolSelections[type]) {
                          setToolSelections((s) => ({ ...s, [type]: allToolsForType(type) }))
                        }
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">When should it run?</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["schedule", "channel", "manual"] as TriggerType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTrigger(t)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs transition-colors",
                trigger === t
                  ? "border-primary/50 bg-primary/5 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t === "schedule" ? "On a schedule" : t === "channel" ? "On a message" : "Only when I ask"}
            </button>
          ))}
        </div>
        {trigger === "schedule" && (
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="mt-2 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          >
            {presets.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        )}
        {trigger === "channel" && (
          <select
            value={channelConnectorId}
            onChange={(e) => setChannelConnectorId(e.target.value)}
            className="mt-2 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          >
            <option value="">Pick an account to listen on…</option>
            {channelConnectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {trigger === "channel" && channelConnectors.length === 0 && (
          <p className="text-xs text-amber-700">
            Connect a Telegram Bot, Twilio, WhatsApp, or Instagram account first to use message triggers.
          </p>
        )}
      </div>

      {/* Visible by default. The user is granting this thing the ability to message their
          customers, and a readable instruction sheet is what makes that feel safe. */}
      <div className="space-y-1.5">
        <Label className="text-xs">What it will do</Label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={12}
          placeholder="Describe what the agent should do, in plain language."
          className="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-xs leading-relaxed outline-none"
        />
        <p className="text-xs text-muted-foreground">
          These are the exact instructions the agent receives. Edit anything you disagree with.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Stop if it costs more than</Label>
        <div className="flex gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b}
              onClick={() => setBudget(b)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                budget === b
                  ? "border-primary/50 bg-primary/5 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              ${b}/day
            </button>
          ))}
        </div>
      </div>

      {missingRequired.length > 0 && (
        <p className="text-xs text-amber-700">
          Connect {missingRequired.map((c) => CONNECTOR_LABEL[c]).join(" and ")} to continue.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button size="sm" variant="ghost" onClick={onBack} className="text-xs">
          Back
        </Button>
        <Button size="sm" onClick={handleCreate} disabled={!canCreate} className="text-xs">
          {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          Create and try it
        </Button>
      </div>
    </div>
  )
}

function ConnectorRow({
  type,
  required,
  options,
  value,
  onChange,
  onConnect,
  onToggle,
  enabledTools,
  onToolToggle,
  approvalTools,
  onApprovalToggle,
}: {
  type: ConnectorType
  required: boolean
  options: Connector[]
  value: string
  onChange: (id: string) => void
  onConnect: () => void
  onToggle?: (enabled: boolean) => void
  enabledTools: string[]
  onToolToggle: (name: string, enabled: boolean) => void
  approvalTools: string[]
  onApprovalToggle: (name: string, requiresApproval: boolean) => void
}) {
  const label = CONNECTOR_LABEL[type]
  const selected = options.find((o) => o.id === value) ?? options[0]
  const iconSrc = connectorIconSrc(type, selected?.name)
  const isEnabled = !!value
  const tools = CONNECTOR_TOOLS[type] ?? []

  if (options.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {iconSrc && <Image src={iconSrc} alt="" width={16} height={16} className="shrink-0" />}
          {label}
          {!required && <span className="ml-1.5 text-muted-foreground/60">optional</span>}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            window.open("/connectors", "_blank")
            const onFocus = () => {
              onConnect()
              window.removeEventListener("focus", onFocus)
            }
            window.addEventListener("focus", onFocus)
          }}
        >
          <Plus className="size-3" /> Connect
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        !isEnabled && "opacity-50",
      )}
    >
      {/* Header: checkbox + icon + label + account selector */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs"
          onClick={() => onToggle?.(!isEnabled)}
          disabled={!onToggle}
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded border transition-colors",
              isEnabled
                ? "border-green-600 bg-green-600 text-white"
                : "border-muted-foreground/40 bg-transparent",
            )}
          >
            {isEnabled && <Check className="size-2.5" />}
          </span>
          {iconSrc && <Image src={iconSrc} alt="" width={16} height={16} className="shrink-0" />}
          <span className="font-medium">{label}</span>
        </button>
        {options.length === 1 ? (
          <span className="truncate text-xs text-muted-foreground">{options[0].name}</span>
        ) : (
          <select
            value={value || options[0]?.id}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 max-w-[55%] rounded-lg border border-input bg-transparent px-2 text-xs outline-none"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tool pills — three states: on → requires approval (shield) → off → on */}
      {isEnabled && tools.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tools.map((t) => {
              const on = enabledTools.includes(t.name)
              const needsApproval = approvalTools.includes(t.name)

              function cycle() {
                if (!on) { onToolToggle(t.name, true); return }
                if (!needsApproval) { onApprovalToggle(t.name, true); return }
                // approval → off: also remove from approval list
                onApprovalToggle(t.name, false)
                onToolToggle(t.name, false)
              }

              return (
                <button
                  key={t.name}
                  type="button"
                  title={needsApproval ? `${t.description} — requires approval` : t.description}
                  onClick={cycle}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs transition-colors",
                    !on && "text-muted-foreground/60 line-through hover:bg-muted",
                    on && !needsApproval && "border-primary/30 bg-primary/5 text-primary",
                    needsApproval && "border-amber-300 bg-amber-50 text-amber-700",
                  )}
                >
                  {needsApproval && <Shield className="size-2.5 shrink-0" />}
                  {t.name}
                </button>
              )
            })}
          </div>
          {approvalTools.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground/70">
              <Shield className="mr-1 inline size-3 text-amber-600" />
              Amber tools pause the agent and wait for your approval before running.
            </p>
          )}
        </>
      )}
    </div>
  )
}


const SIMULATED_PREFIX = "[simulated]"

export function MessageRow({
  role,
  toolName,
  content,
}: {
  role: string
  toolName: string | null
  content: string
}) {
  const isSimulated = content.startsWith(SIMULATED_PREFIX)
  const displayContent = isSimulated ? content.slice(SIMULATED_PREFIX.length).trimStart() : content
  const label = toolName ?? role
  const tone = isSimulated
    ? "text-amber-600"
    : role === "tool"
      ? "text-blue-700"
      : role === "assistant"
        ? "text-foreground"
        : "text-muted-foreground"

  return (
    <div className={cn("flex gap-3 text-xs", isSimulated && "opacity-70")}>
      <span className={cn("w-32 shrink-0 truncate font-mono", tone)}>
        {isSimulated ? "⬡ " : ""}{label}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-muted-foreground italic-if-simulated">
        {displayContent}
      </span>
    </div>
  )
}
