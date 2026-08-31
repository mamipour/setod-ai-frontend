"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import { Bot, ChevronDown, Loader2, RotateCcw, Send, Sparkles } from "lucide-react"
import { agents, connectors, type Agent, type Connector } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const CONNECTOR_ICON: Partial<Record<string, string>> = {
  openai: "/openai.svg",
  anthropic: "/anthropic.svg",
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id?: string
  role: "user" | "assistant"
  content: string
  streaming?: boolean
  /** Transient research activity line, replaced by each new [STATUS] event */
  status?: string
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ModelSelect({
  brains,
  value,
  onChange,
}: {
  brains: Connector[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = brains.find((b) => b.id === value)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [])

  if (brains.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-xs outline-none hover:bg-muted/40"
      >
        {selected && CONNECTOR_ICON[selected.type] && (
          <Image src={CONNECTOR_ICON[selected.type]!} alt="" width={12} height={12} className="shrink-0" />
        )}
        <span className="truncate">{selected?.name ?? "Choose model"}</span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border bg-card py-1 shadow-lg">
          {brains.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { onChange(b.id); setOpen(false) }}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-2 text-xs transition-colors hover:bg-muted",
                b.id === value && "bg-primary/5 text-primary",
              )}
            >
              {CONNECTOR_ICON[b.type] && (
                <Image src={CONNECTOR_ICON[b.type]!} alt="" width={12} height={12} className="shrink-0" />
              )}
              <span className="truncate">{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageContent({
  content,
}: {
  content: string
}) {
  return (
    <div className="prose prose-sm max-w-none text-inherit [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_p]:my-1 [&_strong]:font-semibold">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const isBlock = !props.ref && String(children).includes("\n")
            const text = String(children).replace(/\n$/, "")
            if (isBlock) {
              return (
                <div className="my-2">
                  <pre className="rounded-lg bg-muted/60 p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                    <code>{text}</code>
                  </pre>
                </div>
              )
            }
            return (
              <code className="rounded bg-muted/60 px-1 py-0.5 text-xs font-mono" {...props}>
                {children}
              </code>
            )
          },
          pre({ children }) {
            return <>{children}</>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AssistantTab({
  agent,
  orgId,
}: {
  agent: Agent
  orgId: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [brains, setBrains] = useState<Connector[]>([])
  const [modelId, setModelId] = useState<string>(agent.model_connector_id ?? "")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load connectors and thread history in parallel
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [connList, thread] = await Promise.all([
        connectors.list(orgId),
        agents.assistMessages(agent.id),
      ])
      const aiConns = connList.filter((c) => c.type === "openai" || c.type === "anthropic")
      setBrains(aiConns)
      if (!modelId && aiConns.length > 0) setModelId(aiConns[0].id)
      setMessages(thread.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })))
    } finally {
      setLoading(false)
    }
  }, [agent.id, orgId, modelId])

  useEffect(() => { loadAll() }, [agent.id, orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  async function send() {
    const text = input.trim()
    if (!text || streaming || !modelId) return

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", streaming: true },
    ])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setStreaming(true)

    try {
      const res = await fetch(`${API_BASE}/agents/${agent.id}/assist/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, model_connector_id: modelId }),
      })

      if (!res.ok || !res.body) throw new Error(`API error ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6)
          if (payload === "[DONE]") break
          if (payload.startsWith("[STATUS] ")) {
            // Transient activity line — replace previous status, keep content unchanged
            const statusText = payload.slice(9)
            setMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = { ...next[next.length - 1], status: statusText, streaming: true }
              return next
            })
            continue
          }
          // Content chunk — clear status once text starts arriving
          accumulated += payload.replace(/\\n/g, "\n")
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = { role: "assistant", content: accumulated, streaming: true, status: undefined }
            return next
          })
        }
      }

      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: "assistant", content: accumulated }
        return next
      })
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." }
        return next
      })
    } finally {
      setStreaming(false)
    }
  }

  async function clearThread() {
    if (!confirm("Clear this conversation? This cannot be undone.")) return
    await agents.clearAssistThread(agent.id)
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const hasNoModel = brains.length === 0
  const canSend = !streaming && !loading && !!modelId && input.trim().length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b mb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>Agent copilot</span>
          {loading && <Loader2 className="size-3 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              title="Clear conversation"
              onClick={clearThread}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="size-3" /> Clear
            </button>
          )}
          <ModelSelect brains={brains} value={modelId} onChange={setModelId} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 py-12">
            <div className="rounded-full bg-primary/10 p-3">
              <Bot className="size-5 text-primary" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-medium text-foreground">Ask me to improve your prompt</p>
              <p className="text-xs">
                Describe what you want the agent to do, share a prompt to refine, or ask if your agent is healthy.
              </p>
            </div>
            {hasNoModel && (
              <p className="text-xs text-amber-600 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 max-w-xs">
                Connect an OpenAI or Anthropic key first — go to Connectors and add one.
              </p>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id ?? i} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="size-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted/50 rounded-bl-sm",
              )}
            >
              {m.role === "assistant" ? (
                <>
                  {m.status && !m.content && (
                    <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin shrink-0" />
                      {m.status}
                    </p>
                  )}
                  {m.content && <MessageContent content={m.content} />}
                </>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              )}
              {m.streaming && m.content && (
                <span className="inline-block size-1.5 rounded-full bg-current animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 pt-3 border-t">
        <div className="relative flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-primary/20">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder={
              hasNoModel
                ? "Add an AI connector first..."
                : loading
                  ? "Loading conversation..."
                  : "Ask anything about your agent..."
            }
            disabled={hasNoModel || streaming || loading}
            className="flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            style={{ minHeight: "36px", maxHeight: "160px" }}
          />
          <Button
            size="sm"
            onClick={send}
            disabled={!canSend}
            className="shrink-0 size-8 p-0 rounded-lg"
          >
            {streaming ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Shift + Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}
