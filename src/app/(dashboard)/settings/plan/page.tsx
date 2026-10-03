"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Check, CreditCard, Mic, TrendingUp, Zap, ArrowDown } from "lucide-react"
import { billing, type OrgPlan, type UsageMeter } from "@/lib/api"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const METER_LABEL: Record<string, string> = {
  model_credits: "AI tokens",
  voice_minutes: "Voice minutes",
}

const PLANS = [
  {
    code: "free",
    name: "Free",
    price: "CA$0/mo",
    features: ["3 agents", "3 members", "10k rows", "Community support"],
  },
  {
    code: "pro",
    name: "Pro",
    price: "CA$49/mo",
    features: ["10 agents", "10 members", "100k rows", "Managed AI models"],
  },
  {
    code: "business",
    name: "Business",
    price: "CA$149/mo",
    features: ["Unlimited agents & members", "Unlimited rows", "Voice add-ons", "Priority support"],
  },
]

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, business: 2 }

function UsageBar({ meter, included, used, overage }: { meter: string; included: number; used: number; overage: number }) {
  const label = METER_LABEL[meter] ?? meter
  const pct = included > 0 ? Math.min(100, (used / included) * 100) : 0
  const isOver = used > included && included > 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn("text-muted-foreground tabular-nums", isOver && "text-orange-600 font-medium")}>
          {Math.round(used).toLocaleString()} / {included > 0 ? included.toLocaleString() : "∞"}
          {overage > 0 && <span className="ml-1 text-orange-600">(+{Math.round(overage).toLocaleString()} overage)</span>}
        </span>
      </div>
      {included > 0 && (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isOver ? "bg-orange-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function PlanBadge({ code }: { code: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    free:     { label: "Free",     cls: "bg-gray-100 text-gray-700 border-gray-200" },
    pro:      { label: "Pro",      cls: "bg-blue-50 text-blue-700 border-blue-200" },
    business: { label: "Business", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  }
  const { label, cls } = map[code] ?? { label: code, cls: "bg-gray-100 text-gray-700 border-gray-200" }
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls)}>
      {label}
    </span>
  )
}

function PlanPageInner() {
  const { activeOrg } = useActiveOrg()
  const params = useSearchParams()
  const [plan, setPlan] = useState<OrgPlan | null>(null)
  const [usage, setUsage] = useState<UsageMeter[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState<string | null>(null)
  const [addonLoading, setAddonLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const successMsg = params?.get("checkout") === "success"
  const currentRank = PLAN_RANK[plan?.plan_code ?? "free"] ?? 0

  useEffect(() => {
    if (!activeOrg?.id) return
    Promise.all([
      billing.getPlan(activeOrg.id),
      billing.getUsage(activeOrg.id),
    ]).then(([p, u]) => {
      setPlan(p)
      setUsage(u)
    }).finally(() => setLoading(false))
  }, [activeOrg?.id])

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleChangePlan(planCode: string) {
    if (!activeOrg?.id) return
    setChanging(planCode)
    try {
      const res = await billing.changePlan(activeOrg.id, planCode) as Record<string, string | undefined>
      if (res.url) {
        window.location.href = res.url
      } else if (res.effective === "end_of_period") {
        const date = res.effective_date ?? "the end of the billing period"
        showToast(`Downgrade to ${PLANS.find(p => p.code === planCode)?.name ?? planCode} scheduled for ${date}`)
        const updated = await billing.getPlan(activeOrg.id)
        setPlan(updated)
        setChanging(null)
      } else {
        showToast(`Upgraded to ${PLANS.find(p => p.code === planCode)?.name ?? planCode}`)
        const updated = await billing.getPlan(activeOrg.id)
        setPlan(updated)
        setChanging(null)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Plan change failed"
      showToast(msg, "error")
      setChanging(null)
    }
  }

  async function handleAddon(addonCode: string) {
    if (!activeOrg?.id) return
    setAddonLoading(addonCode)
    try {
      const { url } = await billing.createAddonCheckout(activeOrg.id, addonCode)
      window.location.href = url
    } catch {
      setAddonLoading(null)
    }
  }

  async function handleReactivate() {
    if (!activeOrg?.id) return
    setReactivating(true)
    try {
      await billing.reactivate(activeOrg.id)
      showToast("Subscription reactivated — your plan will renew as normal")
      const updated = await billing.getPlan(activeOrg.id)
      setPlan(updated)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Reactivation failed", "error")
    } finally {
      setReactivating(false)
    }
  }

  async function handlePortal() {
    if (!activeOrg?.id) return
    setPortalLoading(true)
    try {
      const { url } = await billing.createPortal(activeOrg.id)
      window.location.href = url
    } catch {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground text-sm">Loading plan…</div>
  }

  const isSubscribed = !!plan?.subscription?.stripe_customer_id
  const anyScheduled = plan?.subscription?.status === "downgrade_scheduled" || plan?.subscription?.status === "cancel_at_period_end"

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan &amp; Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and monitor resource usage.</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          "rounded-lg border p-4 flex items-start gap-3",
          toast.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
        )}>
          <Check className={cn("h-5 w-5 mt-0.5 shrink-0", toast.type === "success" ? "text-green-600" : "text-red-600")} />
          <p className={cn("font-medium", toast.type === "success" ? "text-green-800" : "text-red-800")}>{toast.msg}</p>
        </div>
      )}

      {successMsg && !toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-green-800">Subscription activated</p>
            <p className="text-sm text-green-700 mt-0.5">Welcome to {plan?.plan_name}. Your new features are now available.</p>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{plan?.plan_name ?? "—"}</span>
                {plan && <PlanBadge code={plan.plan_code} />}
              </div>
              {plan?.subscription?.status === "downgrade_scheduled" && plan.subscription.current_period_end && (
                <p className="text-xs text-orange-600 mt-0.5 font-medium">
                  Downgrading to {PLANS.find(p => p.code === plan.subscription?.pending_plan_code)?.name ?? plan.subscription?.pending_plan_code} on {new Date(plan.subscription.current_period_end).toLocaleDateString("en-CA")}
                </p>
              )}
              {plan?.subscription?.status === "cancel_at_period_end" && plan.subscription.current_period_end && (
                <p className="text-xs text-orange-600 mt-0.5 font-medium">
                  Cancels {new Date(plan.subscription.current_period_end).toLocaleDateString("en-CA")} — access continues until then
                </p>
              )}
              {plan?.subscription?.status === "active" && plan.subscription.current_period_end && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Renews {new Date(plan.subscription.current_period_end).toLocaleDateString("en-CA")}
                </p>
              )}
              {plan?.subscription?.status === "past_due" && (
                <p className="text-xs text-red-600 mt-0.5 font-medium">Payment past due — update your payment method</p>
              )}
            </div>
          </div>
          {isSubscribed && (
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
              <CreditCard className="h-4 w-4 mr-2" />
              {portalLoading ? "Opening…" : "Manage billing"}
            </Button>
          )}
        </div>

        {/* Features */}
        {plan && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            {Object.entries(plan.features).map(([feat, enabled]) => (
              <div key={feat} className="flex items-center gap-2 text-sm">
                <Check className={cn("h-3.5 w-3.5", enabled ? "text-green-600" : "text-muted-foreground/40")} />
                <span className={cn(enabled ? "text-foreground" : "text-muted-foreground/60")}>
                  {feat.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage meters */}
      {usage.length > 0 && (
        <div className="rounded-lg border p-6 space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Usage this month</h2>
          </div>
          {usage.map((m) => (
            <UsageBar key={m.meter} {...m} />
          ))}
        </div>
      )}

      {/* Plan switch cards */}
      <div className="rounded-lg border p-6 space-y-4">
        {/* ── Reactivate banner (cancellation or downgrade scheduled) ── */}
        {plan?.subscription?.status === "cancel_at_period_end" && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Your subscription is set to cancel</p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                You keep full access until {plan.subscription.current_period_end ? new Date(plan.subscription.current_period_end).toLocaleDateString("en-CA") : "the end of your billing period"}. Changed your mind?
              </p>
            </div>
            <Button size="sm" onClick={handleReactivate} disabled={reactivating} className="shrink-0">
              {reactivating ? "Reactivating…" : "Keep subscription"}
            </Button>
          </div>
        )}

        {plan?.subscription?.status === "downgrade_scheduled" && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Downgrade to {PLANS.find(p => p.code === plan.subscription?.pending_plan_code)?.name ?? plan.subscription?.pending_plan_code} scheduled
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                Takes effect {plan.subscription.current_period_end ? new Date(plan.subscription.current_period_end).toLocaleDateString("en-CA") : "next billing cycle"}. Changed your mind?
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleReactivate} disabled={reactivating} className="shrink-0">
              {reactivating ? "Cancelling…" : "Cancel downgrade"}
            </Button>
          </div>
        )}

        <h2 className="font-semibold text-foreground">
          {plan?.plan_code === "free" ? "Upgrade your plan" : "Change plan"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {PLANS.filter(p => p.code !== plan?.plan_code).map((p) => {
            const targetRank = PLAN_RANK[p.code] ?? 0
            const isUpgrade = targetRank > currentRank
            const isDowngrade = targetRank < currentRank
            const isFreeDowngrade = p.code === "free"
            const busy = changing === p.code
            const isAlreadyScheduled = plan?.subscription?.status === "downgrade_scheduled" && plan.subscription?.pending_plan_code === p.code
            const isCancellingToFree = plan?.subscription?.status === "cancel_at_period_end" && isFreeDowngrade

            return (
              <div key={p.code} className={cn(
                "rounded-lg border p-4 space-y-3",
                isDowngrade && "border-dashed opacity-80"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{p.name}</div>
                    <div className="text-sm text-muted-foreground">{p.price}</div>
                  </div>
                  <PlanBadge code={p.code} />
                </div>
                <ul className="space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCancellingToFree ? (
                  // Already scheduled to go to free — show the date, no action needed
                  <Button variant="outline" className="w-full text-muted-foreground" size="sm" disabled>
                    Scheduled for {plan?.subscription?.current_period_end ? new Date(plan.subscription.current_period_end).toLocaleDateString("en-CA") : "end of period"}
                  </Button>
                ) : isFreeDowngrade ? (
                  <Button
                    variant="outline"
                    className="w-full text-muted-foreground"
                    size="sm"
                    onClick={handlePortal}
                    disabled={portalLoading || anyScheduled}
                  >
                    {portalLoading ? "Opening…" : "Downgrade to Free"}
                  </Button>
                ) : isAlreadyScheduled ? (
                  <Button variant="outline" className="w-full text-muted-foreground" size="sm" disabled>
                    Scheduled for {plan?.subscription?.current_period_end ? new Date(plan.subscription.current_period_end).toLocaleDateString("en-CA") : "end of period"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isDowngrade ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleChangePlan(p.code)}
                    disabled={!!changing || anyScheduled}
                  >
                    {busy ? (isUpgrade ? "Upgrading…" : "Scheduling…") : (
                      <>
                        {isUpgrade ? "Upgrade" : "Downgrade"} to {p.name}
                        {isUpgrade
                          ? <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          : <ArrowDown className="h-3.5 w-3.5 ml-1.5" />
                        }
                      </>
                    )}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {isSubscribed && !anyScheduled && (
          <p className="text-xs text-muted-foreground">
            Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing period — you keep full access until then.
          </p>
        )}
      </div>

      {/* Voice add-ons */}
      {plan && plan.plan_code !== "free" && !plan.features?.voice && (
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Voice add-ons</h2>
          </div>
          <p className="text-sm text-muted-foreground">Add a voice package to answer inbound phone calls with your AI agent.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { code: "voice_lite",     name: "Voice Lite",     price: "CA$149/mo", minutes: 400,   overage: "CA$0.29/min" },
              { code: "voice_standard", name: "Voice Standard", price: "CA$299/mo", minutes: 1_000, overage: "CA$0.29/min" },
            ].map((a) => (
              <div key={a.code} className="rounded-lg border p-4 space-y-3">
                <div>
                  <div className="font-semibold text-foreground">{a.name}</div>
                  <div className="text-sm text-muted-foreground">{a.price}</div>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    {a.minutes.toLocaleString()} included minutes/mo
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    {a.overage} overage
                  </li>
                </ul>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleAddon(a.code)}
                  disabled={!!addonLoading}
                >
                  {addonLoading === a.code ? "Redirecting…" : (
                    <>
                      Add {a.name}
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense>
      <PlanPageInner />
    </Suspense>
  )
}
