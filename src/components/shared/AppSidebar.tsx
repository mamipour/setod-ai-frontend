"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Plug,
  Plus,
  Settings,
  ShieldCheck,
  StickyNote,
  Users,
  Wand2,
  type LucideIcon,
  X,
} from "lucide-react"
import { approvals, auth } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { OrgMembership } from "@/lib/api"

// ── Nav definition ────────────────────────────────────────────────────────────

const NAV_MAIN: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard",  label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/agents",     label: "Agents",     Icon: Bot },
  { href: "/connectors", label: "Connectors", Icon: Plug },
  { href: "/skills",     label: "Skills",     Icon: Wand2 },
  { href: "/notes",      label: "Notes",      Icon: StickyNote },
  { href: "/approvals",  label: "Approvals",  Icon: ShieldCheck },
]

const NAV_WORKSPACE: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/members",  label: "Members",  Icon: Users },
  { href: "/settings", label: "Settings", Icon: Settings },
]

const BADGE_POLL_MS = 30_000
const COLLAPSE_KEY = "sidebar:collapsed"

// ── NavLink ───────────────────────────────────────────────────────────────────

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
      aria-current={active ? "page" : undefined}
      title={mini ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg py-1.5 text-sm transition-colors",
        mini ? "justify-center px-2" : "px-3",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <span className="shrink-0">{children}</span>
      {!mini && <span className="flex-1">{label}</span>}
      {!mini && badge && (
        <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  )
}

// ── Workspace picker ──────────────────────────────────────────────────────────

function WorkspacePicker({ mini }: { mini: boolean }) {
  const { activeOrg, setActiveOrgId, orgs, reload } = useActiveOrg()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [createError, setCreateError] = useState("")

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true); setCreateError("")
    try {
      const { workspace: wsApi } = await import("@/lib/api")
      const org = await wsApi.createWorkspace(name)
      await reload?.()
      setActiveOrgId(org.id)
      setOpen(false); setNewName("")
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create workspace")
    } finally { setCreating(false) }
  }

  if (!activeOrg) return null
  const initials = activeOrg.name.slice(0, 2).toUpperCase()

  const dropdown = (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className={cn(
        "absolute z-50 rounded-xl border bg-popover shadow-lg py-1",
        mini ? "left-10 top-0 w-52" : "left-0 right-0 mt-1 top-full"
      )}>
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Workspaces
        </p>
        {orgs.map((org) => (
          <button
            key={org.id}
            onClick={() => { setActiveOrgId(org.id); setOpen(false) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-[10px] font-bold">
              {org.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-left">{org.name}</span>
            <span className="text-[10px] text-muted-foreground/60 capitalize shrink-0">{org.role}</span>
            {org.id === activeOrg.id && <Check className="size-3.5 shrink-0 text-primary" />}
          </button>
        ))}
        <CreateWorkspaceRow
          newName={newName} setNewName={setNewName}
          creating={creating} createError={createError} onSubmit={handleCreate}
        />
      </div>
    </>
  )

  if (mini) {
    return (
      <div className="relative mb-3">
        <button
          onClick={() => setOpen((v) => !v)}
          title={activeOrg.name}
          className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold transition-colors hover:bg-primary/20"
        >
          {initials}
        </button>
        {open && dropdown}
      </div>
    )
  }

  return (
    <div className="relative mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/60"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-[10px] font-bold">
          {initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-left font-medium text-sm">{activeOrg.name}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && dropdown}
    </div>
  )
}

function CreateWorkspaceRow({ newName, setNewName, creating, createError, onSubmit }: {
  newName: string; setNewName: (v: string) => void
  creating: boolean; createError: string; onSubmit: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  if (!expanded) {
    return (
      <>
        <div className="my-1 border-t" />
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Plus className="size-3.5" /> New workspace
        </button>
      </>
    )
  }
  return (
    <>
      <div className="my-1 border-t" />
      <div className="px-3 py-2 space-y-1.5">
        <input
          autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); if (e.key === "Escape") setExpanded(false) }}
          placeholder="Workspace name"
          className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
        />
        {createError && <p className="text-[10px] text-destructive">{createError}</p>}
        <div className="flex gap-1.5">
          <button onClick={onSubmit} disabled={creating || !newName.trim()}
            className="flex-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90">
            {creating ? "Creating…" : "Create"}
          </button>
          <button onClick={() => { setExpanded(false); setNewName("") }}
            className="rounded-md border px-2 py-1 text-[11px] hover:bg-muted">
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ── User menu (avatar → popover with sign-out) ─────────────────────────────────

function UserMenu({ user, mini }: { user: { name: string; email: string; avatar_url?: string | null }; mini: boolean }) {
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await auth.logout()
    window.location.href = "/"
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent/60",
          mini && "justify-center px-0",
        )}
        title={mini ? user.name : undefined}
      >
        <Avatar className="size-7 shrink-0">
          <AvatarImage src={user.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        {!mini && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-medium leading-tight">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground leading-tight">{user.email}</p>
            </div>
            <ChevronUp className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !open && "rotate-180")} />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn(
            "absolute z-50 bottom-full mb-1 rounded-xl border bg-popover shadow-lg py-1 w-52",
            mini ? "left-10 bottom-0 mb-0" : "left-0 right-0",
          )}>
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <Link
              href="/help"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <HelpCircle className="size-4 shrink-0" />
              Help & docs
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            >
              <LogOut className="size-4 shrink-0" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Sidebar content ───────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { activeOrg } = useActiveOrg()

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  const orgId = activeOrg?.id ?? ""

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1")
  }, [])

  useEffect(() => setDrawerOpen(false), [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [drawerOpen])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      window.localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1")
      return !prev
    })
  }

  const fetchBadge = useCallback(async () => {
    if (!orgId) return
    try { const { count } = await approvals.count(orgId); setPendingApprovals(count) }
    catch { /* non-critical */ }
  }, [orgId])

  useEffect(() => {
    fetchBadge()
    const t = setInterval(fetchBadge, BADGE_POLL_MS)
    return () => clearInterval(t)
  }, [fetchBadge])

  function content({ mini, drawer }: { mini: boolean; drawer?: boolean }) {
    return (
      <>
        {/* Logo + collapse toggle */}
        <div className={cn("mb-4 flex items-center gap-2", mini ? "justify-center" : "px-2", drawer && "pr-8")}>
          {mini ? (
            <button onClick={toggleCollapsed} aria-label="Expand sidebar" title="Expand sidebar"
              className="group relative flex size-8 shrink-0 items-center justify-center rounded-lg">
              <img src="/logo.svg" alt="setod" className="w-8 h-8 rounded-lg group-hover:opacity-0 transition-opacity" />
              <PanelLeft className="absolute size-4 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <>
              <img src="/logo.svg" alt="setod" className="w-8 h-8 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">Setod</span>
              {!drawer && (
                <button onClick={toggleCollapsed} aria-label="Collapse sidebar" title="Collapse sidebar"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <PanelLeftClose className="size-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Workspace picker */}
        <WorkspacePicker mini={mini} />

        {/* Primary nav */}
        <nav className="flex-1 space-y-0.5">
          {NAV_MAIN.map(({ href, label, Icon }) => (
            <NavLink key={href} href={href} label={label}
              badge={href === "/approvals" && pendingApprovals > 0 ? String(pendingApprovals) : undefined}
              active={pathname === href} mini={mini}>
              <Icon className="size-[18px]" />
            </NavLink>
          ))}

          {/* Workspace group separator */}
          {!mini && (
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Workspace
            </p>
          )}
          {mini && <div className="my-2 border-t mx-1" />}

          {NAV_WORKSPACE.map(({ href, label, Icon }) => (
            <NavLink key={href} href={href} label={label} active={pathname === href} mini={mini}>
              <Icon className="size-[18px]" />
            </NavLink>
          ))}
        </nav>

        {/* User menu at bottom */}
        {user && (
          <div className="mt-3 border-t pt-3">
            <UserMenu user={user} mini={mini} />
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* Desktop rail */}
      <aside className={cn(
        "hidden h-screen shrink-0 flex-col border-r bg-card py-4 transition-[width] duration-200 md:flex",
        collapsed ? "w-16 px-2" : "w-56 px-3",
      )}>
        {content({ mini: collapsed })}
      </aside>

      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden">
        <button onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Menu className="size-5" />
        </button>
        <img src="/logo.svg" alt="setod" className="w-6 h-6 rounded-md" />
        <span className="truncate text-sm font-semibold">{activeOrg?.name ?? "Platform"}</span>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-60 flex-col border-r bg-card px-3 py-4 shadow-xl animate-in slide-in-from-left duration-200">
            <button onClick={() => setDrawerOpen(false)} aria-label="Close navigation"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="size-4" />
            </button>
            {content({ mini: false, drawer: true })}
          </aside>
        </div>
      )}
    </>
  )
}
