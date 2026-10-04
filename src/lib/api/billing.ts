import { apiFetch } from "./base"

export interface ActiveAddon {
  code: string
  status: string
  cancel_at: string | null         // ISO — set when removal is scheduled
  pending_addon_code: string | null // set for swap-down
  allowance_minutes: number
  used_minutes: number
}

export interface AddonPreview {
  action: "add" | "swap_up" | "swap_down" | "remove"
  effective: "immediate" | "period_end"
  amount_due_cents: number
  minutes_this_period: number
  period_end: string | null
  renewal_price_cents: number
}

export interface OrgPlan {
  plan_code: string
  plan_name: string
  features: Record<string, boolean>
  limits: Record<string, number>
  included: Record<string, number>
  /** Monthly credit included in the plan (cents). 0 on Free. */
  monthly_credit_cents?: number
  /** Current credit ledger balance (cents). Populated when plan includes managed models. */
  credit_balance_cents?: number
  /** Active add-ons with detail. */
  active_addons?: ActiveAddon[]
  subscription: {
    status: string | null
    stripe_customer_id: string | null
    current_period_end: string | null
    pending_plan_code: string | null
  } | null
}

export interface UsageMeter {
  meter: string
  included: number
  used: number
  overage: number
}

// Catalog types returned by GET /billing/catalog
export interface CatalogAddon {
  code: string
  display_name: string
  price_usd_monthly: number // cents
  included_minutes: number
  overage_price_per_unit: number // cents per minute
  features: Record<string, boolean>
}

export interface CatalogPlan {
  code: string
  display_name: string
  price_usd_monthly: number // cents
  monthly_credit_cents: number
  max_agents: number // -1 = unlimited
  max_rows: number   // -1 = unlimited
  features: Record<string, boolean>
  included: Record<string, number>
  sort_order: number
}

export interface BillingCatalog {
  plans: CatalogPlan[]
  addons: CatalogAddon[]
}

export const billing = {
  getPlan: (orgId: string): Promise<OrgPlan> => apiFetch(`/billing/${orgId}/plan`),
  getUsage: (orgId: string, year?: number, month?: number): Promise<UsageMeter[]> => {
    const qs = year && month ? `?year=${year}&month=${month}` : ""
    return apiFetch(`/billing/${orgId}/usage${qs}`)
  },
  getCatalog: (): Promise<BillingCatalog> => apiFetch("/billing/catalog"),
  createCheckout: (orgId: string, planCode: string): Promise<{ url: string }> =>
    apiFetch(`/billing/${orgId}/checkout`, {
      method: "POST",
      body: JSON.stringify({ plan_code: planCode }),
    }),
  /** Upgrade or downgrade an existing subscription in-place.
   *  Returns { status: "ok" } for in-place change, or { url } for new subscriber redirect. */
  changePlan: (orgId: string, planCode: string): Promise<{ status?: string; url?: string }> =>
    apiFetch(`/billing/${orgId}/change-plan`, {
      method: "POST",
      body: JSON.stringify({ plan_code: planCode }),
    }),
  /** Preview the charge / effect of adding, swapping, or removing an add-on. */
  addonPreview: (orgId: string, addonCode: string): Promise<AddonPreview> =>
    apiFetch(`/billing/${orgId}/addon-preview?addon_code=${encodeURIComponent(addonCode)}`),
  createAddonCheckout: (orgId: string, addonCode: string): Promise<{ url?: string; status?: string; effective?: string; effective_date?: string }> =>
    apiFetch(`/billing/${orgId}/addon-checkout`, {
      method: "POST",
      body: JSON.stringify({ addon_code: addonCode }),
    }),
  removeAddon: (orgId: string, addonCode: string): Promise<{ status: string; effective_date?: string }> =>
    apiFetch(`/billing/${orgId}/addon/${encodeURIComponent(addonCode)}`, { method: "DELETE" }),
  keepAddon: (orgId: string, addonCode: string): Promise<{ status: string }> =>
    apiFetch(`/billing/${orgId}/addon/${encodeURIComponent(addonCode)}/keep`, { method: "POST" }),
  createPortal: (orgId: string): Promise<{ url: string }> =>
    apiFetch(`/billing/${orgId}/portal`, { method: "POST" }),
  reactivate: (orgId: string): Promise<{ status: string }> =>
    apiFetch(`/billing/${orgId}/reactivate`, { method: "POST" }),
  /** Returns items that would exceed limits on the target plan (null fields = OK). */
  downgradeImpact: (orgId: string, targetPlan: string): Promise<{
    agents: { current: number; limit: number; over: number } | null
    rows: { current: number; limit: number; over: number } | null
  }> => apiFetch(`/billing/${orgId}/downgrade-impact?target_plan=${encodeURIComponent(targetPlan)}`),
  /** Start a Stripe Checkout session for a prepaid credit top-up pack. */
  createTopupCheckout: (orgId: string, packId: string): Promise<{ url: string }> =>
    apiFetch(`/billing/${orgId}/topup-checkout`, {
      method: "POST",
      body: JSON.stringify({ pack_id: packId }),
    }),
  getBillingSettings: (orgId: string): Promise<{
    auto_recharge_enabled: boolean
    threshold_cents: number
    recharge_amount_cents: number
    monthly_cap_cents: number
    auto_recharged_this_month_cents: number
    auto_recharge_failed_at: string | null
    allow_voice_overage: boolean
  }> => apiFetch(`/billing/${orgId}/billing-settings`),
  updateBillingSettings: (orgId: string, patch: {
    auto_recharge_enabled?: boolean
    threshold_cents?: number
    recharge_amount_cents?: number
    monthly_cap_cents?: number
    allow_voice_overage?: boolean
  }): Promise<{ status: string }> =>
    apiFetch(`/billing/${orgId}/billing-settings`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
}

// ── Voice ─────────────────────────────────────────────────────────────────────

