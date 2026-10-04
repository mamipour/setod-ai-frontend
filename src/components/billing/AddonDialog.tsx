"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Calendar, Check, Loader2, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { billing, type AddonPreview, type CatalogAddon } from "@/lib/api"

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "end of period"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/**
 * Confirmation dialog shown before activating, swapping, or removing a voice add-on.
 *
 * Fetches addon-preview on open to show exact prorated charge / end-date before the user commits.
 */
export function AddonDialog({
  open,
  addon,
  orgId,
  onClose,
  onConfirm,
}: {
  open: boolean
  /** The add-on being acted on (the target for add/swap; the current for remove). */
  addon: CatalogAddon | null
  orgId: string
  onClose: () => void
  /** Called when user confirms — should call the appropriate billing API and refresh plan. */
  onConfirm: () => Promise<void>
}) {
  const [preview, setPreview] = useState<AddonPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || !addon) {
      setPreview(null)
      setError("")
      return
    }
    setLoading(true)
    billing
      .addonPreview(orgId, addon.code)
      .then(setPreview)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load preview"))
      .finally(() => setLoading(false))
  }, [open, addon?.code, orgId])

  if (!addon) return null

  const action = preview?.action ?? "add"
  const immediate = preview?.effective === "immediate"
  const periodEndStr = fmtDate(preview?.period_end)

  async function handleConfirm() {
    setBusy(true)
    setError("")
    try {
      await onConfirm()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusy(false)
    }
  }

  const actionLabel = {
    add: "Add",
    swap_up: "Upgrade",
    swap_down: "Switch",
    remove: "Remove",
  }[action] ?? "Confirm"

  const isRemove = action === "remove"
  const isPeriodEnd = !immediate

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="size-4 text-muted-foreground" />
            {isRemove ? `Remove ${addon.display_name}` : `${actionLabel} ${addon.display_name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading preview…
            </div>
          )}

          {!loading && preview && (
            <>
              {/* Immediate charge */}
              {immediate && !isRemove && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-3 space-y-1">
                  <p className="font-medium text-green-800 dark:text-green-300">Charged today</p>
                  <p className="text-green-700 dark:text-green-300/80">
                    {preview.amount_due_cents > 0
                      ? `${fmt(preview.amount_due_cents)} prorated for the rest of this billing period.`
                      : "No charge for the rest of this period."}
                  </p>
                  {preview.minutes_this_period > 0 && (
                    <p className="text-green-700 dark:text-green-300/80">
                      You get <strong>{preview.minutes_this_period.toLocaleString()} included minutes</strong> until {periodEndStr}.
                    </p>
                  )}
                  {preview.renewal_price_cents > 0 && (
                    <p className="text-green-700/70 dark:text-green-300/60">
                      From {periodEndStr}: {fmt(preview.renewal_price_cents)}/mo for {addon.included_minutes.toLocaleString()} min/mo.
                    </p>
                  )}
                </div>
              )}

              {/* Period-end (remove or swap-down) */}
              {isPeriodEnd && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 p-3 space-y-1">
                  <p className="font-medium text-orange-800 dark:text-orange-300">
                    {isRemove ? "Keeps working until" : "Change takes effect"} {periodEndStr}
                  </p>
                  <p className="text-orange-700 dark:text-orange-300/80">
                    {isRemove
                      ? `Your ${addon.display_name} continues until then — no refund for the current period.`
                      : `You keep your current add-on until ${periodEndStr}, then ${addon.display_name} activates.`}
                  </p>
                  {preview.renewal_price_cents > 0 && !isRemove && (
                    <p className="text-orange-700/70 dark:text-orange-300/60">
                      From {periodEndStr}: {fmt(preview.renewal_price_cents)}/mo for {addon.included_minutes.toLocaleString()} min/mo.
                    </p>
                  )}
                </div>
              )}

              {/* Feature list for adds/swaps */}
              {!isRemove && (
                <ul className="space-y-1.5 pt-1">
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Check className="size-3.5 text-green-600 shrink-0" />
                    {addon.included_minutes.toLocaleString()} included minutes/mo
                  </li>
                  {addon.overage_price_per_unit > 0 && (
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <Check className="size-3.5 text-green-600 shrink-0" />
                      {fmt(addon.overage_price_per_unit)}/min overage (billed automatically)
                    </li>
                  )}
                </ul>
              )}
            </>
          )}

          {error && <p className="text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} className="text-xs">
            Cancel
          </Button>
          <Button
            variant={isRemove ? "outline" : "default"}
            size="sm"
            onClick={handleConfirm}
            disabled={busy || loading}
            className="text-xs"
          >
            {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {isRemove ? `Remove — ends ${periodEndStr}` : (
              <>
                {actionLabel}
                {immediate && preview?.amount_due_cents
                  ? ` — pay ${fmt(preview.amount_due_cents)} today`
                  : ""}
                <ArrowRight className="size-3.5 ml-1.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
