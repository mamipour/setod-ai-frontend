import { MarketingShell } from "@/components/shared/MarketingShell"
import { SignInCard } from "./GoogleSignInButton"

export default function LoginPage() {
  return (
    <MarketingShell>
      <section>
        <div className="mx-auto max-w-5xl px-6 pb-28 pt-24">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div className="flex flex-col items-center text-center">
              <p className="mb-8 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Sign in
              </p>

              <h1 className="text-5xl font-normal tracking-[-0.03em] sm:text-6xl">
                Your backoffice,
                <br />
                <span className="text-muted-foreground">on autopilot.</span>
              </h1>

              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                Connect your accounts, write the rules once, and let agents handle the boring work.
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-5">
              <p className="mb-5 text-sm text-foreground">Welcome back</p>
              <SignInCard />
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
