"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Check, CreditCard, Mic, TrendingUp, Zap, ArrowDown, Coins } from "lucide-react"
import { billing, type OrgPlan, type UsageMeter, type CatalogPlan, type CatalogAddon } from "@/lib/api"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { ChangePlanDialog } from "@/components/billing/ChangePlanDialog"
import { cn } from "@/lib/utils"

const METER_LABEL: Record<string, string> = {
  model_credits: "AI credits (USD)",
  voice_minutes: "Voice minutes",
}

/** Format a plan's price_usd_monthly (cents) into a display string. */
function formatPrice(cents: number): string {
  if (cents === 0) return "Free"
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}/mo`
}

/** Build human-readable feature bullets from a CatalogPlan. */
function planBullets(p: CatalogPlan): string[] {
  const bullets: string[] = []
  // Agents
  bullets.push(p.max_agents === -1 ? "Unlimited agents" : `${p.max_agents} agents`)
  // Rows
  bullets.push(p.max_rows === -1 ? "Unlimited data rows" : `${(p.max_rows / 1000).toFixed(0)}k data rows`)
  // Managed models credit
  if (p.monthly_credit_cents > 0) {
    bullets.push(`$${(p.monthly_credit_cents / 100).toFixed(0)}/mo managed model credit`)
  } else {
    bullets.push("BYOK (bring your own API key)")
  }
  // Voice
  if (p.features?.voice) {
    bullets.push("Voice calling included")
  }
  // Support
  if (p.code === "business") bullets.push("Priority support")
  else if (p.code === "pro") bullets.push("Priority support")
  else bullets.push("Community support")
  return bullets
}

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
  const [catalogPlans, setCatalogPlans] = useState<CatalogPlan[]>([])
  const [catalogAddons, setCatalogAddons] = useState<CatalogAddon[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState<string | null>(null)
  const [addonLoading, setAddonLoading] = useState<string | null>(null)
  const [topupLoading, setTopupLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [autoRecharge, setAutoRecharge] = useState<{
    auto_recharge_enabled: boolean
    threshold_cents: number
    recharge_amount_cents: number
    monthly_cap_cents: number
    auto_recharged_this_month_cents: number
    auto_recharge_failed_at: string | null
  } | null>(null)

  const successMsg = params?.get("checkout") === "success"
  const currentRank = PLAN_RANK[plan?.plan_code ?? "free"] ?? 0

  useEffect(() => {
    if (!activeOrg?.id) return
    Promise.all([
      billing.getPlan(activeOrg.id),
      billing.getUsage(activeOrg.id),
      billing.getCatalog(),
      billing.getBillingSettings(activeOrg.id).catch(() => null),
    ]).then(([p, u, cat, ar]) => {
      setPlan(p)
      setUsage(u)
      setCatalogPlans(cat.plans.sort((a, b) => a.sort_order - b.sort_order))
      setCatalogAddons(cat.addons)
      if (ar) setAutoRecharge(ar)
    }).finally(() => setLoading(false))
  }, [activeOrg?.id])

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  /** Button handler: new subscribers go straight to Checkout (Stripe is the confirmation);
   *  existing subscribers get an in-app confirm first, since the change is immediate/binding. */
  function handleChangePlan(planCode: string) {
    if (!activeOrg?.id) return
    if (plan?.subscription?.stripe_customer_id && plan.plan_code !== "free") {
      setConfirmTarget(planCode)
      return
    }
    void executeChangePlan(planCode)
  }

  async function executeChangePlan(planCode: string) {
    if (!activeOrg?.id) return
    setChanging(planCode)
    try {
      const res = await billing.changePlan(activeOrg.id, planCode) as Record<string, string | undefined>
      if (res.url) {
        window.location.assign(res.url)
        return
      }
      const name = catalogPlans.find(p => p.code === planCode)?.display_name ?? planCode
      if (res.effective === "end_of_period") {
        showToast(`Downgrade to ${name} scheduled for ${res.effective_date ?? "the end of the billing period"}`)
      } else {
        showToast(`Upgraded to ${name}`)
      }
      setPlan(await billing.getPlan(activeOrg.id))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Plan change failed"
      showToast(msg, "error")
      throw e // let the dialog show it inline too
    } finally {
      setChanging(null)
    }
  }

  async function handleAddon(addonCode: string) {
    if (!activeOrg?.id) return
    setAddonLoading(addonCode)
    try {
      const res = await billing.createAddonCheckout(activeOrg.id, addonCode) as { url?: string; status?: string }
      if (res.url) {
        window.location.assign(res.url)
        return
      }
      // Inline modification — refresh plan
      showToast("Voice add-on activated")
      setPlan(await billing.getPlan(activeOrg.id))
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to activate add-on", "error")
    } finally {
      setAddonLoading(null)
    }
  }

  async function handleTopup(packId: string) {
    if (!activeOrg?.id) return
    setTopupLoading(packId)
    try {
      const { url } = await billing.createTopupCheckout(activeOrg.id, packId)
      window.location.assign(url)
    } catch {
      setTopupLoading(null)
    }
  }

  async function toggleAutoRecharge() {
    if (!activeOrg?.id || !autoRecharge) return
    const updated = await billing.updateBillingSettings(activeOrg.id, {
      auto_recharge_enabled: !autoRecharge.auto_recharge_enabled,
    })
    if (updated.status === "ok") {
      setAutoRecharge(prev => prev ? { ...prev, auto_recharge_enabled: !prev.auto_recharge_enabled } : prev)
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
      window.location.assign(url)
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
              {plan && (() => {
                const cp = catalogPlans.find(p => p.code === plan.plan_code)
                return cp ? (
                  <p className="text-sm text-muted-foreground">{formatPrice(cp.price_usd_monthly)}</p>
                ) : null
              })()}
              {plan?.subscription?.status === "downgrade_scheduled" && plan.subscription.current_period_end && (
                <p className="text-xs text-orange-600 mt-0.5 font-medium">
                  Downgrading to {catalogPlans.find(p => p.code === plan.subscription?.pending_plan_code)?.display_name ?? plan.subscription?.pending_plan_code} on {new Date(plan.subscription.current_period_end).toLocaleDateString("en-US")}
                </p>
              )}
              {plan?.subscription?.status === "cancel_at_period_end" && plan.subscription.current_period_end && (
                <p className="text-xs text-orange-600 mt-0.5 font-medium">
                  Cancels {new Date(plan.subscription.current_period_end).toLocaleDateString("en-US")} — access continues until then
                </p>
              )}
              {plan?.subscription?.status === "active" && plan.subscription.current_period_end && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Renews {new Date(plan.subscription.current_period_end).toLocaleDateString("en-US")}
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

        {/* Current plan features */}
        {plan && (() => {
          const currentCatalogPlan = catalogPlans.find(p => p.code === plan.plan_code)
          const bullets = currentCatalogPlan ? planBullets(currentCatalogPlan) : []
          if (bullets.length === 0) return null
          return (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              {bullets.map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <span className="text-foreground">{b}</span>
                </div>
              ))}
            </div>
          )
        })()}
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

      {/* AI Credit Balance (managed model plans only) */}
      {plan && plan.plan_code !== "free" && (plan.credit_balance_cents !== undefined || plan.monthly_credit_cents) && (
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">AI Credits</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums">
                ${((plan.credit_balance_cents ?? 0) / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current balance · ${((plan.monthly_credit_cents ?? 0) / 100).toFixed(0)}/mo included with your plan
              </p>
              {autoRecharge?.auto_recharge_failed_at && (
                <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Auto-recharge failed — please update your payment method</p>
              )}
            </div>
            <div className="text-right space-y-1">
              {autoRecharge && (
                <Button
                  variant={autoRecharge.auto_recharge_enabled ? "default" : "outline"}
                  size="sm"
                  onClick={toggleAutoRecharge}
                  className="text-xs"
                >
                  {autoRecharge.auto_recharge_enabled ? "Auto-recharge on" : "Enable auto-recharge"}
                </Button>
              )}
            </div>
          </div>
          {/* Top-up packs */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Top up credits</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "pack_500",   label: "$5",   sub: "500¢" },
                { id: "pack_1000",  label: "$10",  sub: "1k¢" },
                { id: "pack_2500",  label: "$25",  sub: "2.5k¢" },
                { id: "pack_5000",  label: "$50",  sub: "5k¢" },
                { id: "pack_10000", label: "$100", sub: "10k¢" },
              ].map(pack => (
                <Button
                  key={pack.id}
                  variant="outline"
                  size="sm"
                  className="flex-col h-auto py-2 px-3 text-xs"
                  onClick={() => handleTopup(pack.id)}
                  disabled={!!topupLoading}
                >
                  {topupLoading === pack.id ? (
                    <span>…</span>
                  ) : (
                    <>
                      <span className="font-semibold">{pack.label}</span>
                      <span className="text-muted-foreground">{pack.sub}</span>
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
          {/* Auto-recharge settings summary */}
          {autoRecharge?.auto_recharge_enabled && (
            <p className="text-xs text-muted-foreground">
              Auto-recharge: +${(autoRecharge.recharge_amount_cents / 100).toFixed(0)} when balance drops below ${(autoRecharge.threshold_cents / 100).toFixed(0)} · monthly cap ${(autoRecharge.monthly_cap_cents / 100).toFixed(0)} (${(autoRecharge.auto_recharged_this_month_cents / 100).toFixed(2)} used this month)
            </p>
          )}
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
                Downgrade to {catalogPlans.find(p => p.code === plan.subscription?.pending_plan_code)?.display_name ?? plan.subscription?.pending_plan_code} scheduled
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                Takes effect {plan.subscription.current_period_end ? new Date(plan.subscription.current_period_end).toLocaleDateString("en-US") : "next billing cycle"}. Changed your mind?
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
          {catalogPlans.filter(p => p.code !== plan?.plan_code).map((p) => {
            const targetRank = p.sort_order
            const isUpgrade = targetRank > currentRank
            const isDowngrade = targetRank < currentRank
            const isFreeDowngrade = p.code === "free"
            const busy = changing === p.code
            const isAlreadyScheduled = plan?.subscription?.status === "downgrade_scheduled" && plan.subscription?.pending_plan_code === p.code
            const isCancellingToFree = plan?.subscription?.status === "cancel_at_period_end" && isFreeDowngrade
            const bullets = planBullets(p)

            return (
              <div key={p.code} className={cn(
                "rounded-lg border p-4 space-y-3",
                isDowngrade && "border-dashed opacity-80"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{p.display_name}</div>
                    <div className="text-sm text-muted-foreground">{formatPrice(p.price_usd_monthly)}</div>
                  </div>
                  <PlanBadge code={p.code} />
                </div>
                <ul className="space-y-1.5">
                  {bullets.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCancellingToFree ? (
                  // Already scheduled to go to free — show the date, no action needed
                  <Button variant="outline" className="w-full text-muted-foreground" size="sm" disabled>
                    Scheduled for {plan?.subscription?.current_period_end ? new Date(plan.subscription.current_period_end).toLocaleDateString("en-US") : "end of period"}
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
                    Scheduled for {plan?.subscription?.current_period_end ? new Date(plan.subscription.current_period_end).toLocaleDateString("en-US") : "end of period"}
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
                        {isUpgrade ? "Upgrade" : "Downgrade"} to {p.display_name}
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

      <ChangePlanDialog
        open={confirmTarget !== null}
        current={catalogPlans.find(p => p.code === plan?.plan_code) ?? null}
        target={catalogPlans.find(p => p.code === confirmTarget) ?? null}
        orgId={activeOrg?.id ?? ""}
        periodEnd={plan?.subscription?.current_period_end ?? null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => executeChangePlan(confirmTarget!)}
      />

      {/* Voice add-ons — shown for Pro/Business */}
      {plan && plan.plan_code !== "free" && catalogAddons.length > 0 && (
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Voice add-ons</h2>
          </div>
          <p className="text-sm text-muted-foreground">Add a voice package to answer inbound phone calls with your AI agent. Billed as a line item on your current subscription.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogAddons.map((a) => {
              const isActive = plan.features?.voice && plan.plan_code !== "free"
              const isThisOne = isActive && plan.features?.[`addon_${a.code}`]
              return (
                <div key={a.code} className={cn("rounded-lg border p-4 space-y-3", isThisOne && "border-green-300 bg-green-50/50")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">{a.display_name}</div>
                      <div className="text-sm text-muted-foreground">{formatPrice(a.price_usd_monthly)}</div>
                    </div>
                    {isThisOne && <span className="text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">Active</span>}
                  </div>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      {a.included_minutes.toLocaleString()} included minutes/mo
                    </li>
                    {a.overage_price_per_unit > 0 && (
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        ${(a.overage_price_per_unit / 100).toFixed(2)}/min overage
                      </li>
                    )}
                  </ul>
                  <Button
                    className="w-full"
                    size="sm"
                    variant={isThisOne ? "outline" : "default"}
                    onClick={() => handleAddon(a.code)}
                    disabled={!!addonLoading}
                  >
                    {addonLoading === a.code ? "Processing…" : isThisOne ? "Manage" : (
                      <>
                        Add {a.display_name}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
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
