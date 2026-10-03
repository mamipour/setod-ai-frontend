"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ApiError, billing } from "@/lib/api"

interface UpgradeDialogProps {
  open: boolean
  onClose: () => void
  orgId: string
  feature: string
  planRequired?: string | null
  message?: string
}

const PLAN_NAMES: Record<string, string> = {
  pro: "Pro",
  business: "Business",
}

export function UpgradeDialog({ open, onClose, orgId, feature, planRequired, message }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planName = planRequired ? (PLAN_NAMES[planRequired] ?? planRequired) : "Pro"

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const { url } = await billing.createCheckout(orgId, planRequired ?? "pro")
      window.location.href = url
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade to {planName}</DialogTitle>
          <DialogDescription>
            {message ?? `The "${feature}" feature requires the ${planName} plan.`}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-red-600 px-1">{error}</p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading ? "Redirecting…" : `Upgrade to ${planName}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
