"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { agents, type Agent, type AgentSettings } from "@/lib/api"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { approxCost, tokensForBudget } from "@/components/agents/shared"
import { cn } from "@/lib/utils"

const BUDGETS = [1, 2, 5, 10, 25]

const SETTINGS_DEFAULTS: AgentSettings = {
  max_iterations: 10,
  tool_concurrency: 3,
  web_search: false,
  web_search_provider: "native",
  live_page_access: false,
  search_context: "medium",
  reasoning: false,
  episodic_memory: false,
  daily_token_budget: 500_000,
}

export function SettingsTab({
  agent,
  onPatch,
}: {
  agent: Agent
  onPatch: (changes: Partial<Agent>) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Always merge against defaults. JSONB columns only store what was explicitly set, so a
  // field added to DEFAULT_AGENT_SETTINGS after the agent was created will be absent from the
  // stored object. This normalises both the initial render and every optimistic patch.
  function normalise(raw: Partial<AgentSettings>): AgentSettings {
    return { ...SETTINGS_DEFAULTS, ...raw }
  }

  const s = normalise(agent.settings ?? {})

  async function set(changes: Partial<AgentSettings>) {
    setSaving(true)
    setError(null)
    onPatch({ settings: normalise({ ...s, ...changes }) })
    try {
      const updated = await agents.update(agent.id, { settings: changes })
      onPatch({
        settings: normalise(updated.settings),
        has_unpublished_changes: updated.has_unpublished_changes,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
      onPatch({ settings: s })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <Row
        title="How many steps it can take"
        help="Each step is one turn of thinking plus any actions. A run that hits this limit stops and is marked as unfinished, which is safer than letting it loop."
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={30}
            value={s.max_iterations}
            onChange={(e) => set({ max_iterations: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="w-8 text-right text-sm tabular-nums">{s.max_iterations}</span>
        </div>
      </Row>

      <Row
        title="Daily spending limit"
        help="For this agent only. When it is reached, its runs stop until tomorrow rather than quietly costing more."
      >
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => {
            const tokens = tokensForBudget(b)
            const active = Math.abs(s.daily_token_budget - tokens) < tokens * 0.05
            return (
              <button
                key={b}
                onClick={() => set({ daily_token_budget: tokens })}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-primary/50 bg-primary/5 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                ${b}/day
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground/70">
          Currently {s.daily_token_budget.toLocaleString()} tokens, about{" "}
          {approxCost(s.daily_token_budget)} of usage.
        </p>
      </Row>

      <Row
        title="Show its reasoning"
        help="Asks the model to think step by step before acting. Better on complicated judgement calls, slower and more expensive on simple ones."
      >
        <Switch checked={s.reasoning} onCheckedChange={(v) => set({ reasoning: v })} />
      </Row>

      <Row
        title="Web search"
        help="Lets the agent look things up online. Off by default: most agents work from your accounts, and an agent that can browse can be talked into reading things you did not intend."
      >
        <Switch checked={s.web_search} onCheckedChange={(v) => set({ web_search: v })} />
      </Row>

      {s.web_search && (
        <>
          <Row
            title="How many results"
            help="More results give the agent a fuller picture and cost more tokens on every search."
          >
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => set({ search_context: size })}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize transition-colors",
                    s.search_context === size
                      ? "border-primary/50 bg-primary/5 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </Row>

          <Row
            title="Read full pages"
            help="Beyond search results, fetch and read the pages themselves. Slower, and much more text for the model to work through."
          >
            <Switch
              checked={s.live_page_access}
              onCheckedChange={(v) => set({ live_page_access: v })}
            />
          </Row>
        </>
      )}

      <Row
        title="Remember past runs"
        help="Starts each run with a short note of what it concluded on its last five runs. Useful for agents that should not repeat themselves, and it adds a little to every run's cost."
      >
        <Switch
          checked={s.episodic_memory}
          onCheckedChange={(v) => set({ episodic_memory: v })}
        />
      </Row>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Within a single run the agent always remembers everything that happened in that run.
          That is not a setting  -  it is how it works.
        </span>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {saving && <p className="text-xs text-muted-foreground/60">Saving…</p>}
    </div>
  )
}

function Row({
  title,
  help,
  children,
}: {
  title: string
  help: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-8 border-b pb-6 last:border-0">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-medium">{title}</Label>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{help}</p>
      </div>
      <div className="w-56 shrink-0">{children}</div>
    </div>
  )
}
