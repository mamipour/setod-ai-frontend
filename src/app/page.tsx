"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, ArrowRightLeft, Calendar, CheckCircle2, Mail, Search, Send } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { MarketingShell } from "@/components/shared/MarketingShell"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FeedEvent = { Icon: LucideIcon; text: string; kind: "read" | "think" | "act" | "done" }

const SCENARIOS: FeedEvent[][] = [
  [
    { Icon: Mail, text: "Read 4 new emails", kind: "read" },
    { Icon: Search, text: "Found booking request from Sarah M.", kind: "think" },
    { Icon: Calendar, text: "Checking calendar for Tuesday…", kind: "think" },
    { Icon: CheckCircle2, text: "Booked: Tuesday 3 pm · 45 min", kind: "act" },
    { Icon: Send, text: "Confirmation sent to sarah@example.com", kind: "done" },
  ],
  [
    { Icon: Mail, text: "Read 7 new emails", kind: "read" },
    { Icon: Search, text: "Detected cancellation from James K.", kind: "think" },
    { Icon: Calendar, text: "Cancelling Thursday 10 am slot…", kind: "act" },
    { Icon: CheckCircle2, text: "Cancellation confirmed · slot freed", kind: "done" },
    { Icon: ArrowRightLeft, text: "Handed off to Follow-up agent", kind: "done" },
  ],
  [
    { Icon: Mail, text: "Read 2 new emails", kind: "read" },
    { Icon: Search, text: "Invoice follow-up due for Acme Corp", kind: "think" },
    { Icon: Send, text: "Sent polite reminder — 3rd notice", kind: "act" },
    { Icon: CheckCircle2, text: "Logged in CRM · status → awaiting", kind: "done" },
  ],
]

function AgentFeed() {
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [visible, setVisible] = useState<FeedEvent[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    const events = SCENARIOS[scenarioIndex]
    setVisible([])
    setDone(false)
    let i = 0

    const interval = setInterval(() => {
      const ev = events[i]
      if (ev !== undefined) {
        setVisible((prev) => [...prev, ev])
        i++
      } else {
        clearInterval(interval)
        setDone(true)
      }
    }, 900)

    return () => clearInterval(interval)
  }, [scenarioIndex])

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => {
      setScenarioIndex((i) => (i + 1) % SCENARIOS.length)
    }, 3000)
    return () => clearTimeout(t)
  }, [done])

  return (
    <div className="rounded-md border border-border bg-card p-5 text-left">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
        <span className="text-xs text-muted-foreground">Agent running</span>
      </div>

      <div className="min-h-[140px] space-y-2.5">
        {visible.filter(Boolean).map((ev, i) => (
          <div
            key={`${scenarioIndex}-${i}`}
            className="flex items-center gap-2.5 animate-in fade-in duration-200"
          >
            <ev.Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs leading-relaxed text-foreground">{ev.text}</span>
          </div>
        ))}
        {!done && (
          <div className="flex items-center gap-1 pl-0.5">
            <span className="h-1 w-1 rounded-full bg-foreground/30" />
            <span className="h-1 w-1 rounded-full bg-foreground/20" />
            <span className="h-1 w-1 rounded-full bg-foreground/10" />
          </div>
        )}
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section>
      <div className="mx-auto max-w-5xl px-6 pb-28 pt-24">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col items-center text-center">
            <p className="mb-8 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Now in early access
            </p>

            <h1 className="text-5xl font-normal tracking-[-0.03em] sm:text-6xl">
              Your backoffice,
              <br />
              <span className="text-muted-foreground">on autopilot.</span>
            </h1>

            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              Connect your accounts, write the rules once, and let agents handle the boring work.
            </p>

            <div className="mt-10">
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8 font-normal")}>
                Get started free <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
          </div>

          <AgentFeed />
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <MarketingShell>
      <Hero />
    </MarketingShell>
  )
}
