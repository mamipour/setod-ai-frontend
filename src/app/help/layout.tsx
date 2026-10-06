import Link from "next/link"
import { HelpNav } from "./_nav"

export const metadata = {
  title: { default: "Setod Docs", template: "%s — Setod Docs" },
  description: "Documentation for Setod — the agentic AI platform. Learn how to build, connect, and schedule agents.",
}

/**
 * Public layout for /help/… — no authentication required.
 * Intentionally simple so the pages are easy to read by both humans and AI agents.
 */
export default function HelpPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">S</span>
            <span>Setod</span>
          </Link>
          <Link href="/help" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Open app →
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl gap-10 px-4 py-8">
        <HelpNav />

        {/* Article */}
        <main id="main" className="min-w-0 flex-1 pb-20">
          <article className="space-y-8">{children}</article>
        </main>
      </div>
    </div>
  )
}
