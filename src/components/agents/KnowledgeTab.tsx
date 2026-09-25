"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FileText, Link, Loader2, Table2, Trash2, UploadCloud } from "lucide-react"
import { agents, type KnowledgeFile } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const ACCEPT = ".pdf,.txt,.md,.csv,.xlsx"
const POLL_MS = 4000

/**
 * Documents the agent can search at run time. Uploads are parsed immediately and indexed
 * by the worker, so the list polls while anything is still pending or processing.
 */
export function KnowledgeTab({ agentId }: { agentId: string }) {
  const [files, setFiles] = useState<KnowledgeFile[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [addingUrl, setAddingUrl] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    try {
      setFiles(await agents.listKnowledge(agentId))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load files")
    }
  }, [agentId])

  useEffect(() => {
    reload()
  }, [reload])

  // Indexing happens in the worker; keep polling until nothing is in flight.
  const busy = files?.some((f) => f.status === "pending" || f.status === "processing")
  useEffect(() => {
    if (!busy) return
    const t = setInterval(reload, POLL_MS)
    return () => clearInterval(t)
  }, [busy, reload])

  async function upload(list: FileList | File[]) {
    setError(null)
    setUploading(true)
    try {
      for (const file of Array.from(list)) {
        await agents.uploadKnowledge(agentId, file)
      }
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function addUrl() {
    setError(null)
    setAddingUrl(true)
    try {
      await agents.addKnowledgeUrl(agentId, urlInput.trim())
      setUrlInput("")
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch URL")
    } finally {
      setAddingUrl(false)
    }
  }

  async function remove(file: KnowledgeFile) {
    if (!confirm(`Remove "${file.filename}" from this agent's knowledge?`)) return
    await agents.deleteKnowledge(agentId, file.id)
    reload()
  }

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-xl border bg-gradient-to-t from-primary/[0.02] to-card p-5 shadow-xs">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Knowledge
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Documents this agent can search while it works - price lists, policies, FAQs.
            It gets a <span className="font-mono">search_knowledge</span> tool as soon as
            the first file is indexed. Indexing uses your OpenAI account.
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            CSV and Excel files also become tables the agent can filter, count and join with
            SQL through a <span className="font-mono">query_data</span> tool — far more
            reliable than reading thousands of rows.
          </p>
        </div>

        {/* Upload zone */}
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (e.dataTransfer.files.length) upload(e.dataTransfer.files)
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "hover:border-primary/40 hover:bg-muted/40",
          )}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : (
            <UploadCloud className="size-6 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">
            {uploading ? "Uploading…" : "Drop files here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">PDF, TXT, Markdown, CSV or Excel (.xlsx), up to 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.length && upload(e.target.files)}
          />
        </label>

        {/* URL input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="https://example.com/docs/pricing"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && urlInput.trim() && addUrl()}
              disabled={addingUrl}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!urlInput.trim() || addingUrl}
            onClick={addUrl}
          >
            {addingUrl ? <Loader2 className="size-3 animate-spin" /> : "Add URL"}
          </Button>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </p>
        )}

        {/* File list */}
        {files === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            No documents yet. Until you add some, this agent only knows what its
            instructions say.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <FileRow key={f.id} file={f} onDelete={() => remove(f)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FileRow({ file, onDelete }: { file: KnowledgeFile; onDelete: () => void }) {
  const tables = file.tables ?? []
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {file.source_url ? <Link className="size-4" />
          : tables.length > 0 ? <Table2 className="size-4" />
          : <FileText className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        {file.source_url ? (
          <a href={file.source_url} target="_blank" rel="noopener noreferrer"
             className="block truncate text-sm font-medium hover:underline">
            {file.filename}
          </a>
        ) : (
          <p className="truncate text-sm font-medium">{file.filename}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatSize(file.size_bytes)}
          {file.status === "ready" && ` · ${file.chunk_count} passages`}
          {file.status === "error" && file.error && (
            <span className="text-red-600"> · {file.error}</span>
          )}
        </p>
        {tables.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Queryable</span>
            {tables.map((t) => (
              <span key={t.name}>
                {" · "}
                <span className="font-mono">{t.name}</span>
                {" "}{t.row_count.toLocaleString()} rows, {t.column_count} columns
              </span>
            ))}
          </p>
        )}
      </div>
      <StatusBadge status={file.status} />
      <button
        onClick={onDelete}
        title="Remove"
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  )
}

function StatusBadge({ status }: { status: KnowledgeFile["status"] }) {
  if (status === "ready") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-green-700">
        <span className="size-1.5 rounded-full bg-green-500" /> Ready
      </span>
    )
  }
  if (status === "error") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-red-700">
        <span className="size-1.5 rounded-full bg-red-500" /> Failed
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Loader2 className="size-3 animate-spin" /> Indexing
    </span>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
