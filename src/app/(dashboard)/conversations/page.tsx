"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Bot,
  Check,
  Hand,
  MessageCircle,
  RefreshCw,
  Send,
  User,
} from "lucide-react"
import {
  conversations,
  type ConversationSummary,
  type ConversationThread,
  type ConversationMessageOut,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/useUser"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { cn } from "@/lib/utils"

const POLL_MS = 20_000

const CHANNEL_LABEL: Record<string, string> = {
  telegram_bot: "Telegram Bot",
  telegram_client: "Telegram Account",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  twilio: "SMS",
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-green-100 text-green-700" },
    human: { label: "Human", className: "bg-amber-100 text-amber-700" },
    closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
  }
  const { label, className } = map[status] ?? map.open
  return (
    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full", className)}>
      {label}
    </span>
  )
}

function MessageBubble({ msg }: { msg: ConversationMessageOut }) {
  const isOutbound = msg.direction === "outbound"
  const authorIcon =
    msg.author === "agent" ? (
      <Bot size={14} className="shrink-0 text-blue-500 mt-0.5" />
    ) : msg.author === "human" ? (
      <User size={14} className="shrink-0 text-amber-600 mt-0.5" />
    ) : null

  const bodies: string[] = []
  if (msg.text) bodies.push(msg.text)
  for (const att of msg.attachments ?? []) {
    if (att.text) bodies.push(att.text)
    else if (att.status === "pending") bodies.push(`[${att.kind} — processing…]`)
    else bodies.push(`[${att.kind}]`)
  }

  return (
    <div className={cn("flex gap-2 max-w-[80%]", isOutbound ? "ml-auto flex-row-reverse" : "")}>
      {!isOutbound && (
        <div className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium mt-1">
          P
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm",
        )}
      >
        {isOutbound && (
          <div className="flex items-center gap-1 mb-1 opacity-60">
            {authorIcon}
            <span className="text-[10px]">
              {msg.author === "agent" ? "Agent" : "You"}
            </span>
          </div>
        )}
        {bodies.map((b, i) => (
          <p key={i} className="whitespace-pre-wrap break-words">
            {b}
          </p>
        ))}
        <p className={cn("text-[10px] mt-1 opacity-50", isOutbound ? "text-right" : "")}>
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  )
}

export default function ConversationsPage() {
  const { user } = useUser()
  const { activeOrg } = useActiveOrg()
  const orgId = activeOrg?.id ?? ""

  const [list, setList] = useState<ConversationSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [thread, setThread] = useState<ConversationThread | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [patching, setPatching] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadList = useCallback(async () => {
    if (!orgId) return
    setLoadingList(true)
    try {
      const data = await conversations.list(orgId)
      setList(data)
    } catch {
      // silently ignore
    } finally {
      setLoadingList(false)
    }
  }, [orgId])

  const loadThread = useCallback(async (convId: string) => {
    setLoadingThread(true)
    try {
      const data = await conversations.get(convId)
      setThread(data)
    } catch {
      // silently ignore
    } finally {
      setLoadingThread(false)
    }
  }, [])

  // Initial + polling
  useEffect(() => {
    loadList()
    timerRef.current = setInterval(loadList, POLL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loadList])

  // Reload thread when selected changes
  useEffect(() => {
    if (selected) loadThread(selected)
    else setThread(null)
  }, [selected, loadThread])

  // Scroll to bottom when thread loads
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread?.messages?.length])

  const handleSelectConv = (id: string) => {
    setSelected(id)
  }

  const handleBack = () => {
    setSelected(null)
    setThread(null)
  }

  const handlePatchStatus = async (status: string) => {
    if (!selected) return
    setPatching(true)
    try {
      await conversations.patch(selected, status)
      await loadThread(selected)
      await loadList()
    } catch {
      // ignore
    } finally {
      setPatching(false)
    }
  }

  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return
    setSending(true)
    try {
      await conversations.sendManualReply(selected, replyText.trim())
      setReplyText("")
      await loadThread(selected)
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  if (!user) return null

  const currentStatus = thread?.conversation.status ?? "open"

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Thread list ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "w-full md:w-80 border-r flex flex-col shrink-0",
          selected ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Conversations</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadList}
            disabled={loadingList}
            className="h-7 w-7"
          >
            <RefreshCw size={14} className={cn(loadingList && "animate-spin")} />
          </Button>
        </div>

        {list.length === 0 && !loadingList && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
            <div>
              <MessageCircle className="mx-auto mb-2 opacity-40" size={32} />
              <p>No conversations yet.</p>
              <p className="text-xs mt-1 opacity-70">
                Messages from Telegram, WhatsApp, Instagram, or SMS will appear here.
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y">
          {list.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConv(conv.id)}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                selected === conv.id && "bg-muted",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conv.peer_name || conv.peer_id}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {CHANNEL_LABEL[conv.channel] ?? conv.channel}
                    {conv.thread_key && ` · post`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={conv.status} />
                  {conv.last_inbound_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(conv.last_inbound_at)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Thread view ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          !selected ? "hidden md:flex" : "flex",
        )}
      >
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-2 opacity-30" size={40} />
              <p>Select a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="md:hidden h-8 w-8"
              >
                <ArrowLeft size={16} />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {thread?.conversation.peer_name || thread?.conversation.peer_id || "…"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {thread ? CHANNEL_LABEL[thread.conversation.channel] ?? thread.conversation.channel : ""}
                </p>
              </div>
              {thread && (
                <div className="flex items-center gap-2">
                  <StatusBadge status={thread.conversation.status} />
                  {currentStatus === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePatchStatus("human")}
                      disabled={patching}
                      className="h-7 text-xs gap-1"
                    >
                      <Hand size={12} /> Take over
                    </Button>
                  )}
                  {currentStatus === "human" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePatchStatus("open")}
                      disabled={patching}
                      className="h-7 text-xs gap-1"
                    >
                      <Bot size={12} /> Resume agent
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Summary block */}
            {thread?.conversation.summary && (
              <div className="px-4 py-2 bg-muted/40 border-b text-xs text-muted-foreground">
                <span className="font-medium">Earlier: </span>
                {thread.conversation.summary}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingThread && !thread && (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Loading…
                </div>
              )}
              {thread?.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply composer (only when status = human) */}
            {currentStatus === "human" && (
              <div className="border-t px-4 py-3 flex gap-2 items-end">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply…"
                  className="flex-1 resize-none border rounded-md px-3 py-2 text-sm bg-background min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSendReply()
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="h-10 w-10 shrink-0"
                >
                  {sending ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
