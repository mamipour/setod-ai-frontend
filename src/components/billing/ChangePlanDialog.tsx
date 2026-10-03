"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Loader2, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface PlanSummary {
  code: string
  name: string
  price: string
  features: string[]
}

/**
 * Confirms a plan change before it hits Stripe.
 *
 * Upgrades charge the card immediately (prorated); downgrades are scheduled for period end.
 * Both are easy to misclick, so this spells out the timing and billing impact first.
 */
export function ChangePlanDialog({
  open,
  current,
  target,
  periodEnd,
  onClose,
  onConfirm,
}: {
  open: boolean
  current: PlanSummary | null
  target: PlanSummary | null
  /** ISO date of the current period end (renewal date). */
  periodEnd: string | null
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (!current || !target) return null

  const RANK: Record<string, number> = { free: 0, pro: 1, business: 2 }
  const upgrade = (RANK[target.code] ?? 0) > (RANK[current.code] ?? 0)
  const endDate = periodEnd ? new Date(periodEnd).toLocaleDateString("en-CA") : "the end of your billing period"

  const gained = target.features.filter((f) => !current.features.includes(f))
  const lost = current.features.filter((f) => !target.features.includes(f))

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
            {upgrade ? "Upgrade" : "Downgrade"} to {target.name}?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          {upgrade ? (
            <div className="rounded-lg border border-green-300/60 bg-green-50 dark:bg-green-950/30 p-3 space-y-1">
              <p className="font-medium text-green-800 dark:text-green-300">Takes effect immediately</p>
              <p className="text-green-800/80 dark:text-green-300/80">
                Your card is charged a prorated amount for the rest of this billing period today.
                From {endDate} you&apos;ll be billed {target.price}.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-orange-300/60 bg-orange-50 dark:bg-orange-950/30 p-3 space-y-1">
              <p className="font-medium text-orange-800 dark:text-orange-300">Takes effect {endDate}</p>
              <p className="text-orange-800/80 dark:text-orange-300/80">
                You keep everything in {current.name} until then — nothing changes today and there&apos;s no refund
                for the current period. From {endDate} you&apos;ll be billed {target.price}.
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
                  Anything over the {target.name} limits (agents, members, rows) will be paused until you&apos;re back
                  within them.
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
            Keep {current.name}
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
