"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HELP_NAV } from "./nav"
import { cn } from "@/lib/utils"

export function HelpNav() {
  const pathname = usePathname()
  return (
    <nav className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-20 space-y-0.5">
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
  )
}
