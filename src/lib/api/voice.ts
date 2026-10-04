import { apiFetch } from "./base"


export const voice = {
  attachNumber: (triggerId: string): Promise<{ voice_url: string }> =>
    apiFetch(`/voice/attach/${triggerId}`, { method: "POST" }),
  detachNumber: (triggerId: string): Promise<{ status: string }> =>
    apiFetch(`/voice/detach/${triggerId}`, { method: "POST" }),
}

// ── Token-based invitation flow ────────────────────────────────────────────────
export const tokenInvitations = {
  /** Accept an invitation by its token. User must be signed in. */
  accept: (token: string): Promise<{ ok: boolean; org_id: string }> =>
    apiFetch("/auth/invitations/accept", { method: "POST", body: JSON.stringify({ token }) }),

  /** Preview an invitation (name, inviter) without accepting — used by /accept-invite page. */
  preview: (token: string): Promise<{ org_name: string; role: string; invited_by: string; email: string }> =>
    apiFetch(`/auth/invitations/preview?token=${encodeURIComponent(token)}`),
}
