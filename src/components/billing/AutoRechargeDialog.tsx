"use client"

import { useState } from "react"
import { CreditCard, Loader2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
}

/**
 * Confirmation dialog shown before enabling auto-recharge.
 *
 * Shows the threshold, recharge amount, and monthly cap so the user
 * knows exactly what they are authorizing.
 */
export function AutoRechargeDialog({
  open,
  thresholdCents,
  rechargeAmountCents,
  monthlyCap,
  onClose,
  onConfirm,
}: {
  open: boolean
  thresholdCents: number
  rechargeAmountCents: number
  monthlyCap: number
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleConfirm() {
    setBusy(true)
    setError("")
    try {
      await onConfirm()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to enable auto-recharge")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-4 text-yellow-500" />
            Enable Auto-recharge?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
            <p className="font-medium text-blue-800 dark:text-blue-300">What will happen</p>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300/80">
              <li>
                When your AI credit balance drops below <strong>{fmt(thresholdCents)}</strong>, your saved card will be charged automatically.
              </li>
              <li>
                Each recharge adds <strong>{fmt(rechargeAmountCents)}</strong> in credits.
              </li>
              <li>
                Auto-recharges are capped at <strong>{fmt(monthlyCap)}/month</strong> to prevent unexpected charges.
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-2 text-muted-foreground rounded-lg border p-3">
            <CreditCard className="size-3.5 mt-0.5 shrink-0" />
            <p>
              The card saved via <strong>Manage billing</strong> will be charged. If you don&apos;t have a card saved, enable auto-recharge after adding one.
            </p>
          </div>

          <p className="text-muted-foreground">
            You can disable auto-recharge at any time from this page.
          </p>

          {error && <p className="text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} className="text-xs">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={busy}
            className="text-xs"
          >
            {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Enable auto-recharge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
