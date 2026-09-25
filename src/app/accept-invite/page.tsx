"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { auth, tokenInvitations } from "@/lib/api"
import { Button } from "@/components/ui/button"

type Preview = { org_name: string; role: string; invited_by: string; email: string }
type State = "loading" | "ready" | "no-token" | "invalid" | "expired" | "accepting" | "done" | "error"

function AcceptInviteInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") ?? ""

  const [state, setState] = useState<State>("loading")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!token) { setState("no-token"); return }

    async function load() {
      // Fetch invite preview (public, no auth)
      try {
        const p = await tokenInvitations.preview(token)
        setPreview(p)
      } catch (e: unknown) {
        const status = (e as { status?: number }).status
        setState(status === 410 ? "expired" : "invalid")
        return
      }

      // Check if signed in
      try {
        const me = await auth.me()
        setUser({ email: me.email })
      } catch {
        setUser(null)
      }

      setState("ready")
    }

    load()
  }, [token])

  async function handleAccept() {
    setState("accepting")
    try {
      await tokenInvitations.accept(token)
      setState("done")
      // Reload to pick up the new org in /auth/me, then redirect
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong")
      setState("error")
    }
  }

  function handleLogin() {
    // After Google login the callback redirects to /, not back here.
    // Store the token so we can redirect back.
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pending_invite_token", token)
    }
    window.location.href = "/auth/google/login"
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Checking invitation…</p>
      </div>
    )
  }

  if (state === "no-token" || state === "invalid") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <XCircle className="size-10 text-destructive" />
        <h1 className="text-lg font-semibold">Invalid invitation</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This link is invalid or has already been used. Ask the workspace owner to send a new invitation.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>Go to Setod</Button>
      </div>
    )
  }

  if (state === "expired") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <XCircle className="size-10 text-amber-500" />
        <h1 className="text-lg font-semibold">Invitation expired</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This invitation is more than 7 days old. Ask the workspace owner to send a new one.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>Go to Setod</Button>
      </div>
    )
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle className="size-10 text-green-600" />
        <h1 className="text-lg font-semibold">You've joined {preview?.org_name}!</h1>
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <XCircle className="size-10 text-destructive" />
        <h1 className="text-lg font-semibold">Could not accept invitation</h1>
        <p className="text-sm text-muted-foreground max-w-xs">{errorMsg}</p>
        <Button variant="outline" onClick={() => setState("ready")}>Try again</Button>
      </div>
    )
  }

  // state === "ready"
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
        {preview?.org_name.slice(0, 2).toUpperCase()}
      </div>

      <div>
        <h1 className="text-xl font-semibold">You've been invited</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>{preview?.invited_by}</strong> invited you to join{" "}
          <strong>{preview?.org_name}</strong> as a{" "}
          <span className="capitalize">{preview?.role}</span>.
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          Sent to {preview?.email}
        </p>
      </div>

      {user ? (
        <div className="w-full max-w-xs space-y-3">
          {user.email.toLowerCase() !== preview?.email.toLowerCase() && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              You're signed in as <strong>{user.email}</strong>. This invite was sent to{" "}
              <strong>{preview?.email}</strong>. Sign in with the right account to accept.
            </p>
          )}
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={state === "accepting" || user.email.toLowerCase() !== preview?.email.toLowerCase()}
          >
            {state === "accepting" && <Loader2 className="mr-2 size-4 animate-spin" />}
            Accept and join {preview?.org_name}
          </Button>
          {user.email.toLowerCase() !== preview?.email.toLowerCase() && (
            <Button variant="outline" className="w-full" onClick={handleLogin}>
              Sign in with a different account
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in to accept this invitation.
          </p>
          <Button className="w-full" onClick={handleLogin}>
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground/70">
            New to Setod? Sign up with <strong>{preview?.email}</strong> and this invitation will be accepted automatically.
          </p>
        </div>
      )}
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <img src="/logo.svg" alt="Setod" className="h-8 w-8 rounded-lg" />
        </div>
        <Suspense fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }>
          <AcceptInviteInner />
        </Suspense>
      </div>
    </div>
  )
}
