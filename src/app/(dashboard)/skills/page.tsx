"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, ChevronDown, ChevronUp, Edit2, Plus, Trash2, Wand2, X } from "lucide-react"
import { skills, type Skill, type SkillCategory } from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: SkillCategory[] = ["Behaviour", "Output", "Safety", "Domain", "Custom"]

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  Behaviour: "bg-blue-50 text-blue-700 border-blue-200",
  Output:    "bg-violet-50 text-violet-700 border-violet-200",
  Safety:    "bg-amber-50 text-amber-700 border-amber-200",
  Domain:    "bg-green-50 text-green-700 border-green-200",
  Custom:    "bg-muted text-muted-foreground border-border",
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: SkillCategory }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", CATEGORY_COLORS[category])}>
      {category}
    </span>
  )
}

function SkillEditor({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Partial<Skill>
  onSave: (data: { name: string; tagline: string; category: SkillCategory; content: string }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(initial.name ?? "")
  const [tagline, setTagline] = useState(initial.tagline ?? "")
  const [category, setCategory] = useState<SkillCategory>(initial.category ?? "Custom")
  const [content, setContent] = useState(initial.content ?? "")

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Professional tone"
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SkillCategory)}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Tagline</label>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="One-line description shown in the UI"
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="The prompt fragment injected into the agent system prompt when this skill is attached..."
          className="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
      <div className="flex justify-end gap-2 border-t pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <Button
          size="sm"
          onClick={() => onSave({ name, tagline, category, content })}
          disabled={saving || !name.trim() || !content.trim()}
        >
          {saving ? "Saving…" : "Save skill"}
        </Button>
      </div>
    </div>
  )
}

function SkillCard({
  skill,
  onEdit,
  onDelete,
}: {
  skill: Skill
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{skill.name}</span>
            <CategoryBadge category={skill.category} />
            {skill.is_default && (
              <span className="text-[10px] text-muted-foreground">default</span>
            )}
          </div>
          {skill.tagline && (
            <p className="text-xs text-muted-foreground">{skill.tagline}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse" : "Preview content"}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {expanded ? "Hide" : "Preview"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Edit2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t bg-muted/30 px-4 py-3">
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-sans">
            {skill.content}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const { user } = useUser()
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState<SkillCategory | "All">("All")
  const createRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!orgId) return
    skills.list(orgId).then(setAllSkills).finally(() => setLoading(false))
  }, [orgId])

  useEffect(() => {
    if (creating) createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [creating])

  const grouped = CATEGORIES.reduce<Record<string, Skill[]>>((acc, cat) => {
    acc[cat] = allSkills.filter((s) => s.category === cat)
    return acc
  }, {})

  const filtered = activeCategory === "All" ? allSkills : grouped[activeCategory] ?? []

  async function handleCreate(data: { name: string; tagline: string; category: SkillCategory; content: string }) {
    if (!orgId) return
    setSaving(true)
    try {
      const created = await skills.create(orgId, data)
      setAllSkills((prev) => [...prev, created])
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string, data: { name: string; tagline: string; category: SkillCategory; content: string }) {
    setSaving(true)
    try {
      const updated = await skills.update(id, data)
      setAllSkills((prev) => prev.map((s) => (s.id === id ? updated : s)))
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this skill? Agents currently using it will stop applying it.")) return
    await skills.delete(id)
    setAllSkills((prev) => prev.filter((s) => s.id !== id))
  }

  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = (grouped[cat] ?? []).length
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable prompt fragments attached to agents. Each skill adds one focused rule to an agent&apos;s behaviour.
          </p>
        </div>
        <Button onClick={() => { setCreating(true); setEditingId(null) }} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          New skill
        </Button>
      </div>

      {/* Empty state */}
      {!loading && allSkills.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Wand2 className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">No skills yet</p>
            <p className="text-sm text-muted-foreground mt-0.5">Create your first skill to share behaviour rules across agents.</p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5 mt-1">
            <Plus className="size-4" /> New skill
          </Button>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div ref={createRef} className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">New skill</h2>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <SkillEditor
            initial={{}}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Category filter pills */}
      {!loading && allSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(["All", ...CATEGORIES] as const).map((cat) => {
            const count = cat === "All" ? allSkills.length : (categoryCounts[cat] ?? 0)
            if (cat !== "All" && count === 0) return null
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeCategory === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {cat}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  activeCategory === cat ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Skill cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((skill) => (
            editingId === skill.id ? (
              <div key={skill.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold">Edit skill</h2>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <SkillEditor
                  initial={skill}
                  onSave={(data) => handleUpdate(skill.id, data)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <SkillCard
                key={skill.id}
                skill={skill}
                onEdit={() => { setEditingId(skill.id); setCreating(false) }}
                onDelete={() => handleDelete(skill.id)}
              />
            )
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No skills in this category yet.
            </p>
          )}
        </div>
      )}

      {/* Info box */}
      {!loading && allSkills.length > 0 && (
        <div className="flex gap-3 rounded-xl border bg-muted/30 p-4">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Skills are attached per-agent from the <strong className="text-foreground">Agent tab</strong> inside each agent. Default skills are seeded for your workspace but are fully editable.
          </p>
        </div>
      )}
    </div>
  )
}
