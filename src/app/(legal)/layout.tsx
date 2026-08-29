import { MarketingShell } from "@/components/shared/MarketingShell"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-5xl px-6 pb-28 pt-16">
        <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed text-foreground [&_h1]:text-4xl [&_h1]:font-normal [&_h1]:tracking-[-0.03em] [&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-medium [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </article>
      </div>
    </MarketingShell>
  )
}
