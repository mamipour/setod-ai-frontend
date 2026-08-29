"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Navbar() {
  const pathname = usePathname()
  const onLogin = pathname === "/login"

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="setod" className="h-7 w-7 rounded-md" />
          <span className="text-sm tracking-tight">Setod</span>
        </Link>
        {!onLogin && (
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "rounded-full px-4 text-xs font-normal")}>
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="setod" className="h-5 w-5 rounded" />
          <span>© {new Date().getFullYear()} setod</span>
        </div>
        <div className="flex gap-5">
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  )
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
