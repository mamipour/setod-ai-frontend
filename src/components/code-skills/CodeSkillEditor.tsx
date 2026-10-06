"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { Loader2 } from "lucide-react"
import { ApiError, codeSkills, type CodeSkill, type CodeSkillInput, type CodeSkillTestResult } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false })

const DEFAULT_SOURCE = `def main(input: dict, context: dict):
    """
    input   — the arguments the agent passed, matching your Input Schema.
    context — org_id, agent_id, session_id, skill_id, dry_run, invoked_at.
    Return any JSON value. Raise to report an error.
    Secrets you added are available via os.environ["YOUR_KEY"].
    """
    return {"echo": input}
`

const DEFAULT_SCHEMA = `{
  "type": "object",
  "properties": {},
  "additionalProperties": true
}`

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40)
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return err instanceof Error ? err.message : "Something went wrong"
}

export function CodeSkillEditor({
  orgId,
  initial,
  onClose,
  onChange,
}: {
  orgId: string
  initial: CodeSkill | null
  onClose: () => void
  onChange: (skill: CodeSkill | null) => void
}) {
  const { resolvedTheme } = useTheme()
  const [name, setName] = useState(initial?.name ?? "")
  const [tagline, setTagline] = useState(initial?.tagline ?? "")
  const [toolName, setToolName] = useState(initial?.tool_name ?? "")
  const [toolNameTouched, setToolNameTouched] = useState(Boolean(initial))
  const [description, setDescription] = useState(initial?.tool_description ?? "")
  const [schemaText, setSchemaText] = useState(
    initial ? JSON.stringify(initial.input_schema, null, 2) : DEFAULT_SCHEMA,
  )
  const [source, setSource] = useState(initial?.source ?? DEFAULT_SOURCE)
  const [timeout, setTimeoutSeconds] = useState(initial?.timeout_seconds ?? 10)
  const [network, setNetwork] = useState(initial?.network_access ?? false)
  const [readOnly, setReadOnly] = useState(initial?.read_only ?? false)
  const [skill, setSkill] = useState<CodeSkill | null>(initial)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(initial?.deploy_status === "deploying")
  const [secretRows, setSecretRows] = useState<{ key: string; value: string; existing: boolean }[]>([])
  const [secretsNote, setSecretsNote] = useState("")
  const [testOpen, setTestOpen] = useState(false)
  const [testInput, setTestInput] = useState("{}")
  const [testResult, setTestResult] = useState<CodeSkillTestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    if (!skill) return
    codeSkills.secretKeys(skill.id).then(({ keys }) => {
      setSecretRows(keys.map((key) => ({ key, value: "", existing: true })))
    }).catch(() => {})
  }, [skill?.id])

  useEffect(() => {
    if (!deploying || !skill) return
    pollRef.current = window.setInterval(async () => {
      const fresh = await codeSkills.get(skill.id)
      setSkill(fresh)
      onChange(fresh)
      if (fresh.deploy_status !== "deploying") {
        setDeploying(false)
        if (fresh.deploy_status === "failed") setError(fresh.last_deploy_error ?? "Deploy failed")
      }
    }, 2000)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [deploying, skill?.id])

  function onName(value: string) {
    setName(value)
    if (!toolNameTouched) setToolName(slugify(value))
  }

  function parsedSchema(): Record<string, unknown> | null {
    try {
      const schema = JSON.parse(schemaText)
      if (!schema || schema.type !== "object" || typeof schema.properties !== "object") return null
      return schema
    } catch {
      return null
    }
  }

  function payload(): CodeSkillInput | null {
    const input_schema = parsedSchema()
    if (!input_schema) {
      setError("Input schema must be JSON with type \"object\" and a properties object.")
      return null
    }
    return {
      name: name.trim(),
      tagline: tagline.trim(),
      tool_name: toolName.trim(),
      tool_description: description.trim(),
      input_schema,
      source,
      timeout_seconds: timeout,
      network_access: network,
      read_only: readOnly,
    }
  }

  async function save() {
    const body = payload()
    if (!body) return
    setSaving(true)
    setError("")
    try {
      const saved = skill
        ? await codeSkills.update(skill.id, body)
        : await codeSkills.create(orgId, body)
      setSkill(saved)
      onChange(saved)
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setSaving(false)
    }
  }

  async function deploy() {
    if (!skill) return
    setError("")
    setDeploying(true)
    try {
      await codeSkills.deploy(skill.id)
      const fresh = await codeSkills.get(skill.id)
      setSkill(fresh)
      onChange(fresh)
    } catch (err) {
      setDeploying(false)
      setError(messageOf(err))
    }
  }

  async function remove() {
    if (!skill) return
    if (!confirm("Delete this code skill? Agents using it will lose the tool.")) return
    await codeSkills.remove(skill.id)
    onChange(null)
    onClose()
  }

  async function saveSecrets() {
    if (!skill) return
    const next: Record<string, string> = {}
    for (const row of secretRows) {
      const key = row.key.trim()
      if (!key) continue
      if (row.value) next[key] = row.value
    }
    if (Object.keys(next).length === 0 && secretRows.some((r) => r.existing)) {
      setSecretsNote("Type a new value for each secret you want to keep. Saving replaces the whole set.")
      return
    }
    try {
      await codeSkills.putSecrets(skill.id, next)
      setSecretsNote("Saved. Redeploy to apply.")
      setSecretRows(Object.keys(next).map((key) => ({ key, value: "", existing: true })))
    } catch (err) {
      setSecretsNote(messageOf(err))
    }
  }

  async function runTest() {
    if (!skill) return
    setTesting(true)
    setTestResult(null)
    try {
      const input = JSON.parse(testInput)
      setTestResult(await codeSkills.test(skill.id, input))
    } catch (err) {
      setTestResult({ ok: false, error: messageOf(err), duration_ms: 0, log_tail: null })
    } finally {
      setTesting(false)
    }
  }

  const schemaOk = parsedSchema() !== null
  const deployLabel = skill?.deploy_status === "ready" && skill.dirty ? "Redeploy" : "Deploy"

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{skill ? "Edit code skill" : "New code skill"}</h2>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
          Name
          <input value={name} onChange={(e) => onName(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30" />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
          Tagline
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30" />
        </label>
      </div>

      <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
        Tool name
        <input
          value={toolName}
          onChange={(e) => { setToolNameTouched(true); setToolName(e.target.value) }}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
        />
        <span className="block font-normal">The agent sees this as <span className="font-mono">code_{toolName || "tool_name"}</span>.</span>
      </label>

      <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
        Tool description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Tell the agent when and how to use this."
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
        />
      </label>

      <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
        Input schema
        <textarea
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          rows={6}
          spellCheck={false}
          className={cn(
            "w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30",
            schemaOk ? "border-input" : "border-destructive",
          )}
        />
        <span className="block font-normal">JSON Schema. Example: a number field named <span className="font-mono">n</span> is <span className="font-mono">{`{"type":"object","properties":{"n":{"type":"number"}},"required":["n"]}`}</span>.</span>
      </label>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Code</span>
          <span className={cn(source.length > 65536 && "text-destructive")}>{source.length.toLocaleString()} / 65,536</span>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <Monaco
            height="420px"
            language="python"
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            value={source}
            onChange={(value) => setSource(value ?? "")}
            options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
          Timeout (seconds)
          <input
            type="number"
            min={1}
            max={30}
            value={timeout}
            onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
            className="block w-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={network} onChange={(e) => setNetwork(e.target.checked)} />
          Allow network access
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
          Read-only
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        {network
          ? "Function can make outbound HTTP requests. It still has no access to Setod data or AWS resources."
          : "Network is off. The function cannot open connections."}
        {readOnly ? " Safe to run during dry runs and previews." : ""}
      </p>

      {skill && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground">Secrets</p>
          {secretRows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={row.key}
                placeholder="API_KEY"
                onChange={(e) => setSecretRows((prev) => prev.map((r, j) => j === i ? { ...r, key: e.target.value } : r))}
                className="w-40 rounded-md border border-input bg-transparent px-2 py-1 font-mono text-xs"
              />
              <input
                value={row.value}
                placeholder={row.existing ? "••••••" : "value"}
                onChange={(e) => setSecretRows((prev) => prev.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 py-1 font-mono text-xs"
              />
              <button type="button" className="text-xs text-muted-foreground" onClick={() => setSecretRows((prev) => prev.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSecretRows((prev) => [...prev, { key: "", value: "", existing: false }])}>Add secret</button>
            <Button type="button" size="sm" variant="outline" onClick={saveSecrets}>Save secrets</Button>
            {secretsNote && <span className="text-xs text-muted-foreground">{secretsNote}</span>}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="outline" onClick={deploy} disabled={!skill || deploying}>
          {deploying ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Publishing…</> : deployLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => setTestOpen((v) => !v)} disabled={skill?.deploy_status !== "ready"}>
          Test
        </Button>
        {skill && <Button type="button" variant="outline" onClick={remove}>Delete</Button>}
      </div>
      {skill?.deploy_status !== "ready" && (
        <p className="text-xs text-muted-foreground">Test is available after a deploy finishes.</p>
      )}

      {testOpen && skill?.deploy_status === "ready" && (
        <div className="space-y-2 rounded-lg border p-3">
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            Test input
            <textarea value={testInput} onChange={(e) => setTestInput(e.target.value)} rows={4} spellCheck={false} className="w-full rounded-md border border-input bg-transparent px-2 py-1 font-mono text-xs text-foreground" />
          </label>
          <Button type="button" size="sm" onClick={runTest} disabled={testing}>{testing ? "Running…" : "Run"}</Button>
          {testResult && (
            <div className="space-y-1 text-xs">
              <p className={testResult.ok ? "text-green-600" : "text-destructive"}>{testResult.ok ? "ok" : "error"} · {testResult.duration_ms} ms</p>
              <pre className="overflow-auto rounded-md bg-muted p-2 font-mono">{JSON.stringify(testResult.ok ? testResult.result : testResult.error, null, 2)}</pre>
              {testResult.log_tail && (
                <details>
                  <summary className="cursor-pointer text-muted-foreground">Logs</summary>
                  <pre className="mt-1 overflow-auto rounded-md bg-muted p-2 font-mono">{testResult.log_tail}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
