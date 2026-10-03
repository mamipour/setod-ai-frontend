"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Check, CreditCard, TrendingUp, Zap } from "lucide-react"
import { billing, type OrgPlan, type UsageMeter } from "@/lib/api"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const METER_LABEL: Record<string, string> = {
  model_credits: "AI tokens",
  voice_minutes: "Voice minutes",
}

function UsageBar({ meter, included, used, overage }: { meter: string; included: number; used: number; overage: number }) {
  const label = METER_LABEL[meter] ?? meter
  const effectiveIncluded = included || 0
  const pct = effectiveIncluded > 0 ? Math.min(100, (used / effectiveIncluded) * 100) : 0
  const isOver = used > effectiveIncluded && effectiveIncluded > 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn("text-muted-foreground tabular-nums", isOver && "text-orange-600 font-medium")}>
          {Math.round(used).toLocaleString()} / {effectiveIncluded > 0 ? effectiveIncluded.toLocaleString() : "∞"}
          {overage > 0 && <span className="ml-1 text-orange-600">(+{Math.round(overage).toLocaleString()} overage)</span>}
        </span>
      </div>
      {effectiveIncluded > 0 && (
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
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const successMsg = params?.get("checkout") === "success"

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

  async function handleUpgrade(planCode: string) {
    if (!activeOrg?.id) return
    setCheckoutLoading(planCode)
    try {
      const { url } = await billing.createCheckout(activeOrg.id, planCode)
      window.location.href = url
    } catch {
      setCheckoutLoading(null)
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan &amp; Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and monitor resource usage.</p>
      </div>

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-green-800">Subscription activated</p>
            <p className="text-sm text-green-700 mt-0.5">Welcome to {plan?.plan_name}. Your new features are now available.</p>
          </div>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{plan?.plan_name ?? "—"}</span>
                {plan && <PlanBadge code={plan.plan_code} />}
              </div>
              {plan?.subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Renews {new Date(plan.subscription.current_period_end).toLocaleDateString("en-CA")}
                </p>
              )}
              {plan?.subscription?.status === "past_due" && (
                <p className="text-xs text-red-600 mt-0.5 font-medium">Payment past due — update your payment method</p>
              )}
            </div>
          </div>
          {plan?.subscription?.stripe_customer_id ? (
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
              <CreditCard className="h-4 w-4 mr-2" />
              {portalLoading ? "Opening…" : "Manage billing"}
            </Button>
          ) : null}
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

      {/* Upgrade CTAs */}
      {plan && plan.plan_code === "free" && (
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Upgrade your plan</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { code: "pro", name: "Pro", price: "CA$49/mo", features: ["10 agents", "10 members", "100k rows", "Managed AI models"] },
              { code: "business", name: "Business", price: "CA$149/mo", features: ["Unlimited agents & members", "Unlimited rows", "Voice add-ons", "Priority support"] },
            ].map((p) => (
              <div key={p.code} className="rounded-lg border p-4 space-y-3">
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
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleUpgrade(p.code)}
                  disabled={!!checkoutLoading}
                >
                  {checkoutLoading === p.code ? "Redirecting…" : (
                    <>
                      Upgrade to {p.name}
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
