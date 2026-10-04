"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Loader2, Minus, Plus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { billing, type CatalogPlan } from "@/lib/api"

/** Format USD cents into a display string. */
function fmt(cents: number) {
  if (cents === 0) return "Free"
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}/mo`
}

/** Human-readable feature bullets for a CatalogPlan. */
function bullets(p: CatalogPlan): string[] {
  const b: string[] = []
  b.push(p.max_agents === -1 ? "Unlimited agents" : `${p.max_agents} agents`)
  b.push(p.max_rows === -1 ? "Unlimited data rows" : `${(p.max_rows / 1000).toFixed(0)}k data rows`)
  if (p.monthly_credit_cents > 0) {
    b.push(`$${(p.monthly_credit_cents / 100).toFixed(0)}/mo managed model credit`)
  } else {
    b.push("BYOK (bring your own API key)")
  }
  if (p.features?.voice) {
    const voiceMinutes = p.included?.voice_minutes ?? 0
    b.push(voiceMinutes > 0 ? `${voiceMinutes.toLocaleString()} voice minutes/mo included` : "Voice calling")
  }
  if (p.code === "business") b.push("Priority support")
  else if (p.code === "pro") b.push("Priority support")
  else b.push("Community support")
  return b
}

/**
 * Confirms a plan change before it hits Stripe.
 *
 * Upgrades charge the card immediately (prorated); downgrades are scheduled for period end.
 */
export function ChangePlanDialog({
  open,
  current,
  target,
  orgId,
  periodEnd,
  onClose,
  onConfirm,
}: {
  open: boolean
  current: CatalogPlan | null
  target: CatalogPlan | null
  orgId: string
  /** ISO date of the current period end (renewal date). */
  periodEnd: string | null
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [impact, setImpact] = useState<{
    agents: { current: number; limit: number; over: number } | null
    rows: { current: number; limit: number; over: number } | null
  } | null>(null)

  const upgrade = !!target && !!current && target.sort_order > current.sort_order

  // Fetch downgrade impact when dialog opens for a downgrade
  useEffect(() => {
    let cancelled = false
    async function loadImpact() {
      if (!open || !target || !current || upgrade) {
        return
      }
      try {
        const nextImpact = await billing.downgradeImpact(orgId, target.code)
        if (!cancelled) setImpact(nextImpact)
      } catch {
        if (!cancelled) setImpact(null)
      }
    }
    void loadImpact()
    return () => {
      cancelled = true
    }
  }, [open, target, current, upgrade, orgId])

  if (!current || !target) return null

  const endDate = periodEnd ? new Date(periodEnd).toLocaleDateString("en-US") : "the end of your billing period"

  const currentBullets = bullets(current)
  const targetBullets = bullets(target)
  const gained = targetBullets.filter((f) => !currentBullets.includes(f))
  const lost = currentBullets.filter((f) => !targetBullets.includes(f))

  async function handleConfirm() {
    setBusy(true); setError("")
    try {
      await onConfirm()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Plan change failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {upgrade ? <ArrowUp className="size-4 text-green-600" /> : <ArrowDown className="size-4 text-orange-600" />}
            {upgrade ? "Upgrade" : "Downgrade"} to {target.display_name}?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          {upgrade ? (
            <div className="rounded-lg border border-green-300/60 bg-green-50 dark:bg-green-950/30 p-3 space-y-1">
              <p className="font-medium text-green-800 dark:text-green-300">Takes effect immediately</p>
              <p className="text-green-800/80 dark:text-green-300/80">
                Your card is charged a prorated amount for the rest of this billing period today.
                From {endDate} you&apos;ll be billed {fmt(target.price_usd_monthly)}.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-orange-300/60 bg-orange-50 dark:bg-orange-950/30 p-3 space-y-1">
              <p className="font-medium text-orange-800 dark:text-orange-300">Takes effect {endDate}</p>
              <p className="text-orange-800/80 dark:text-orange-300/80">
                You keep everything in {current.display_name} until then — nothing changes today and there&apos;s no
                refund for the current period. From {endDate} you&apos;ll be billed {fmt(target.price_usd_monthly)}.
              </p>
            </div>
          )}

          {gained.length > 0 && (
            <div>
              <p className="font-medium text-foreground mb-1">You&apos;ll get</p>
              <ul className="space-y-0.5">
                {gained.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-muted-foreground">
                    <Plus className="size-3 text-green-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lost.length > 0 && (
            <div>
              <p className="font-medium text-foreground mb-1">You&apos;ll lose{upgrade ? "" : ` on ${endDate}`}</p>
              <ul className="space-y-0.5">
                {lost.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-muted-foreground">
                    <Minus className="size-3 text-red-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {!upgrade && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Anything over the {target.display_name} limits (agents, rows) will be paused until you&apos;re back
                  within them.
                </p>
              )}
            </div>
          )}

          {/* Downgrade impact warnings */}
          {!upgrade && impact && (impact.agents || impact.rows) && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-red-800 dark:text-red-300">
                <AlertTriangle className="size-3.5 shrink-0" />
                Items over the {target.display_name} limit
              </div>
              {impact.agents && (
                <p className="text-red-700 dark:text-red-400">
                  Agents: you have {impact.agents.current}, limit is {impact.agents.limit} — {impact.agents.over} will be paused on {endDate}.
                </p>
              )}
              {impact.rows && (
                <p className="text-red-700 dark:text-red-400">
                  Rows: you have {impact.rows.current.toLocaleString()}, limit is {impact.rows.limit.toLocaleString()} — {impact.rows.over.toLocaleString()} rows will become read-only on {endDate}.
                </p>
              )}
            </div>
          )}

          {!upgrade && (
            <p className="text-muted-foreground">You can cancel the scheduled downgrade any time before {endDate}.</p>
          )}

          {error && <p className="text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} className="text-xs">
            Keep {current.display_name}
          </Button>
          <Button
            variant={upgrade ? "default" : "outline"}
            size="sm"
            onClick={handleConfirm}
            disabled={busy}
            className="text-xs"
          >
            {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {upgrade ? `Upgrade now` : `Schedule downgrade`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
