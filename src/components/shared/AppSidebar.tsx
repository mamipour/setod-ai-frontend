"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bot,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Plug,
  ShieldCheck,
  StickyNote,
  Wand2,
  type LucideIcon,
  X,
} from "lucide-react"
import { approvals, auth } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard",  label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/agents",     label: "Agents",     Icon: Bot },
  { href: "/connectors", label: "Connectors", Icon: Plug },
  { href: "/skills",     label: "Skills",     Icon: Wand2 },
  { href: "/notes",      label: "Notes",      Icon: StickyNote },
  { href: "/approvals",  label: "Approvals",  Icon: ShieldCheck },
]

const BADGE_POLL_MS = 30_000

/** Collapse is a preference, not session state  -  it is restored on the next sign-in too. */
const COLLAPSE_KEY = "sidebar:collapsed"

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  // Read in an effect rather than a useState initialiser so the server render and the
  // first client render agree; localStorage does not exist during SSR.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1")
  }, [])

  // Navigating inside the drawer should close it, or the new page is hidden behind it.
  useEffect(() => setDrawerOpen(false), [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [drawerOpen])

  function toggleCollapsed() {
    setCollapsed((wasCollapsed) => {
      window.localStorage.setItem(COLLAPSE_KEY, wasCollapsed ? "0" : "1")
      return !wasCollapsed
    })
  }

  const orgId = user?.organizations[0]?.id ?? ""
  const orgName = user?.organizations[0]?.name ?? "Platform"

  const fetchBadge = useCallback(async () => {
    if (!orgId) return
    try {
      const { count } = await approvals.count(orgId)
      setPendingApprovals(count)
    } catch { /* sidebar badge is non-critical */ }
  }, [orgId])

  useEffect(() => {
    fetchBadge()
    const t = setInterval(fetchBadge, BADGE_POLL_MS)
    return () => clearInterval(t)
  }, [fetchBadge])

  async function handleLogout() {
    await auth.logout()
    window.location.href = "/"
  }

  /** The same nav in three places: desktop rail, collapsed rail, and mobile drawer. */
  function content({ mini, drawer }: { mini: boolean; drawer?: boolean }) {
    return (
      <>
        <div
          className={cn(
            "mb-6 flex items-center gap-2",
            mini ? "justify-center" : "px-2",
            // Leave room for the drawer's close button, which sits in this row.
            drawer && "pr-8",
          )}
        >
          {mini ? (
            // Collapsed, the logo doubles as the expand control: a 64px rail has no room
            // for a separate button, and swapping the glyph on hover keeps it discoverable.
            <button
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="group relative flex size-8 shrink-0 items-center justify-center rounded-lg"
            >
              <img src="/logo.svg" alt="setod" className="w-8 h-8 rounded-lg group-hover:opacity-0 transition-opacity" />
              <PanelLeft className="absolute size-4 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <>
              <img src="/logo.svg" alt="setod" className="w-8 h-8 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{orgName}</span>
              {!drawer && (
                <button
                  onClick={toggleCollapsed}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              )}
            </>
          )}
        </div>

        <nav className="flex-1">
          <ul className="space-y-1">
            {NAV.map(({ href, label, Icon }) => (
              <li key={href}>
                <NavLink
                  href={href}
                  label={label}
                  badge={href === "/approvals" && pendingApprovals > 0 ? String(pendingApprovals) : undefined}
                  active={pathname === href}
                  mini={mini}
                >
                  <Icon className="size-[18px] shrink-0" />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Help and sign-out sit apart from the primary nav, above the user identity row. */}
        <NavLink
          href="/help"
          label="Help & docs"
          active={pathname.startsWith("/help")}
          mini={mini}
        >
          <HelpCircle className="size-[18px] shrink-0" />
        </NavLink>

        <button
          type="button"
          title={mini ? "Sign out" : undefined}
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            mini ? "justify-center px-0" : "px-3",
          )}
        >
          <LogOut className="size-[18px] shrink-0" />
          {!mini && "Sign out"}
        </button>

        {user && (
          <div className="mt-3 border-t pt-3">
            <div className={cn("flex items-center gap-2", mini ? "justify-center" : "px-2")}>
              <Avatar className="size-7">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!mini && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* ── Desktop rail ── */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r bg-card py-4 transition-[width] duration-200 md:flex",
          collapsed ? "w-16 px-2" : "w-60 px-3",
        )}
      >
        {content({ mini: collapsed })}
      </aside>

      {/* ── Mobile header ── a 240px rail would take two thirds of a phone screen. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <img src="/logo.svg" alt="setod" className="w-6 h-6 rounded-md" />
        <span className="truncate text-sm font-semibold">{orgName}</span>
      </header>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-card px-3 py-4 shadow-xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            {content({ mini: false, drawer: true })}
          </aside>
        </div>
      )}
    </>
  )
}

function NavLink({
  href,
  label,
  badge,
  active,
  mini,
  children,
}: {
  href: string
  label: string
  badge?: string
  active: boolean
  mini: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      // Without this the active state is purely visual and a screen reader hears four
      // identical links.
      aria-current={active ? "page" : undefined}
      title={mini ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors",
        mini ? "justify-center px-0" : "px-3",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {/* A second, non-colour signal for the current page. A sidebar is read in
          peripheral vision, where a tint alone is easy to miss. */}
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <span className={cn("shrink-0", active ? "opacity-100" : "opacity-60")}>{children}</span>
      {!mini && label}
      {!mini && badge && (
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {badge}
        </span>
      )}
    </Link>
  )
}
