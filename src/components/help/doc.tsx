import Link from "next/link"
import { AlertTriangle, Info, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

/** Every help page starts with one of these: a title and a one-line promise. */
export function DocHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <header className="border-b pb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lede}</p>
    </header>
  )
}

export function Section({
  title,
  id,
  children,
}: {
  title: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
}

export function List({
  children,
  items,
}: {
  children?: React.ReactNode
  items?: string[]
}) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/40">
      {items ? items.map((item) => <li key={item}>{item}</li>) : children}
    </ul>
  )
}

export function Steps({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:font-medium marker:text-muted-foreground/60">
      {children}
    </ol>
  )
}

/** Inline code  -  tool names, settings keys, cron strings. */
export function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em] text-foreground">
      {children}
    </code>
  )
}

type CalloutTone = "warn" | "info" | "tip"

const TONE: Record<CalloutTone, { icon: typeof Info; wrap: string; iconClass: string }> = {
  warn: {
    icon: AlertTriangle,
    wrap: "border-amber-200 bg-amber-50 text-amber-900",
    iconClass: "text-amber-600",
  },
  info: {
    icon: Info,
    wrap: "border-border bg-muted/40 text-foreground",
    iconClass: "text-muted-foreground",
  },
  tip: {
    icon: Lightbulb,
    wrap: "border-green-200 bg-green-50 text-green-900",
    iconClass: "text-green-600",
  },
}

export function Callout({
  tone,
  kind,
  title,
  children,
}: {
  tone?: CalloutTone
  kind?: CalloutTone
  title?: string
  children: React.ReactNode
}) {
  const resolved = tone ?? kind ?? "info"
  const { icon: Icon, wrap, iconClass } = TONE[resolved]
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", wrap)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconClass)} />
      <div className="space-y-1 text-sm leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        <div className="[&_p]:m-0">{children}</div>
      </div>
    </div>
  )
}

/** Reference table. Kept narrow  -  two or three columns read fine on a phone, five do not. */
export function Table({
  head,
  headers,
  rows,
}: {
  head?: string[]
  headers?: string[]
  rows: React.ReactNode[][]
}) {
  const cols = head ?? headers ?? []
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {cols.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-4 py-3 leading-relaxed",
                    j === 0 ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Footer link to the next page, so the docs can be read straight through. */
export function NextUp({
  href,
  title,
  page,
}: {
  href?: string
  title?: string
  page?: { href: string; title: string } | null
}) {
  const dest = href ?? page?.href
  const label = title ?? page?.title
  if (!dest || !label) return null

  return (
    <Link
      href={dest}
      className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/40"
    >
      <span className="text-xs text-muted-foreground">Next</span>
      <span className="text-sm font-medium">{label} →</span>
    </Link>
  )
}
