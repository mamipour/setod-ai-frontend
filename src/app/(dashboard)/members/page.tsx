"use client"

import { useEffect, useState } from "react"
import { Crown, Loader2, Mail, Trash2, UserPlus } from "lucide-react"
import { workspace } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Member = { user_id: string; email: string; name: string; role: string }

export default function MembersPage() {
  const { user } = useUser()
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""
  const myUserId = user?.id ?? ""

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"owner" | "member">("member")
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; detail: string } | null>(null)

  const isOwner = members.find((m) => m.user_id === myUserId)?.role === "owner"

  async function load() {
    if (!orgId) return
    try {
      setMembers(await workspace.listMembers(orgId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load members")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteResult(null)
    try {
      const res = await workspace.inviteMember(orgId, inviteEmail.trim(), inviteRole)
      setInviteResult(res)
      setInviteEmail("")
    } catch (e: unknown) {
      setInviteResult({ ok: false, detail: e instanceof Error ? e.message : "Failed to invite" })
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: "owner" | "member") {
    try {
      await workspace.changeMemberRole(orgId, userId, newRole)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to change role")
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member from the workspace?")) return
    try {
      await workspace.removeMember(orgId, userId)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove member")
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 px-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          People with access to this workspace. Owners can change settings and publish agents.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Member list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Workspace members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : members.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No members yet.</p>
          ) : (
            members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                    {m.name?.[0] ?? m.email[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {m.name || m.email}
                      {m.user_id === myUserId && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {m.role === "owner" && (
                    <Crown className="size-3.5 text-amber-500" />
                  )}
                  {isOwner && m.user_id !== myUserId ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value as "owner" | "member")}
                        className="h-7 rounded border bg-background px-1.5 text-xs"
                      >
                        <option value="member">Member</option>
                        <option value="owner">Owner</option>
                      </select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(m.user_id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      m.role === "owner"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {m.role}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Invite form — owners only */}
      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="size-4" /> Invite someone
            </CardTitle>
            <CardDescription className="text-xs">
              They will receive an email. Accepting automatically joins the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "owner" | "member")}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="member">Member</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>

            {inviteResult && (
              <p className={cn("text-xs", inviteResult.ok ? "text-green-700" : "text-destructive")}>
                {inviteResult.ok ? "✓" : "✗"} {inviteResult.detail}
              </p>
            )}

            <Button
              size="sm"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Send invitation
            </Button>
          </CardContent>
        </Card>
      )}

      {!isOwner && !loading && (
        <p className="text-xs text-muted-foreground">
          Only owners can invite or manage members. Contact an owner to make changes.
        </p>
      )}
    </div>
  )
}
