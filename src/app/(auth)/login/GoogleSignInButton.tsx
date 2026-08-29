"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * Sign-in is gated behind an explicit agreement checkbox: users build and run their own
 * agents, so they must actively confirm they read the Terms (as-is, no liability) rather
 * than passively "agreeing by signing in".
 */
export function SignInCard() {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="space-y-4">
      <label
        className="flex cursor-pointer items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5"
        onClick={() => setAgreed((v) => !v)}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={agreed}
          onClick={(e) => {
            e.stopPropagation()
            setAgreed((v) => !v)
          }}
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
            agreed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 bg-background",
          )}
        >
          {agreed && <Check className="size-3" />}
        </button>
        <span className="text-justify text-xs leading-relaxed text-muted-foreground">
          I have read and agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            className="underline underline-offset-4 hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="underline underline-offset-4 hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </Link>
          . I understand that agents I build act on my instructions, that I must test them
          before going live, and that the service is provided as&nbsp;is with no liability for
          what my agents do.
        </span>
      </label>

      <Button
        className="w-full gap-3"
        variant="outline"
        size="lg"
        disabled={!agreed}
        onClick={() => auth.loginWithGoogle()}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      {!agreed && (
        <p className="text-center text-xs text-muted-foreground/60">
          Tick the box above to continue.
        </p>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
