"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { billing, codeSkills, type CodeSkill, type CodeSkillDeployStatus } from "@/lib/api"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CodeSkillEditor } from "./CodeSkillEditor"

const STATUS: Record<CodeSkillDeployStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  deploying: "bg-blue-50 text-blue-700 border-blue-200",
  ready: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
}

export function CodeSkillsPanel() {
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(true)
  const [limit, setLimit] = useState(0)
  const [skills, setSkills] = useState<CodeSkill[]>([])
  const [editing, setEditing] = useState<CodeSkill | null | "new">(null)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    Promise.all([billing.getPlan(orgId), codeSkills.list(orgId).catch(() => [] as CodeSkill[])])
      .then(([plan, list]) => {
        setAllowed(Boolean(plan.features?.code_skills))
        setLimit(Number(plan.limits?.code_skills ?? 0))
        setSkills(list)
      })
      .finally(() => setLoading(false))
  }, [orgId])

  const deploying = skills.some((s) => s.deploy_status === "deploying")
  useEffect(() => {
    if (!deploying || !orgId) return
    const timer = window.setInterval(() => {
      codeSkills.list(orgId).then(setSkills).catch(() => {})
    }, 2000)
    return () => window.clearInterval(timer)
  }, [deploying, orgId])

  function onChange(skill: CodeSkill | null) {
    if (skill === null) {
      setSkills((prev) => prev.filter((s) => editing !== "new" && s.id !== (editing as CodeSkill | null)?.id))
      return
    }
    setSkills((prev) => {
      const without = prev.filter((s) => s.id !== skill.id)
      return [...without, skill].sort((a, b) => a.name.localeCompare(b.name))
    })
    setEditing(skill)
  }

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
        <p className="font-medium">Code skills are available on Pro and Business</p>
        <p className="mt-1 text-sm text-muted-foreground">Write a Python function and let your agents call it.</p>
        <Link href="/settings/plan" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>View plans</Link>
      </div>
    )
  }

  if (editing !== null) {
    return (
      <CodeSkillEditor
        orgId={orgId}
        initial={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onChange={onChange}
      />
    )
  }

  const atLimit = limit >= 0 && skills.length >= limit

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")} disabled={atLimit} title={atLimit ? `Limit of ${limit} code skills` : undefined} className="gap-1.5">
          <Plus className="size-4" /> New code skill
        </Button>
      </div>
      {skills.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No code skills yet</p>
          <p className="mt-1 text-sm text-muted-foreground">A code skill is a Python function your agents can call.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => setEditing(skill)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{skill.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">code_{skill.tool_name}</p>
              </div>
              {skill.dirty && skill.deploy_status === "ready" && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Unpublished changes</span>
              )}
              <span
                title={skill.deploy_status === "failed" ? skill.last_deploy_error ?? "" : undefined}
                className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS[skill.deploy_status])}
              >
                {skill.deploy_status === "deploying" ? "Publishing…" : skill.deploy_status}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{skill.invocation_count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
