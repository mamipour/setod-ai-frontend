"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HELP_NAV } from "./nav"
import { cn } from "@/lib/utils"

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-10">
      {/* Contents rail. Hidden on narrow screens, where the pages read as one sequence
          via the "next" footer instead. */}
      <nav className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-6 space-y-1">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            Help
          </p>
          {HELP_NAV.map(({ href, title }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                pathname === href
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {title}
            </Link>
          ))}
        </div>
      </nav>

      <article className="min-w-0 flex-1 space-y-8 pb-16">{children}</article>
    </div>
  )
}
