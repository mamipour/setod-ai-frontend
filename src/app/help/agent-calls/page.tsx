import { Callout, C, DocHeader, List, NextUp, P, Section } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help — Agent calls agent" }

export default function AgentCallsHelp() {
  return (
    <>
      <DocHeader
        title="Agent calls agent"
        lede="Let one agent hand off work to another — the caller pauses, the target runs in full, and the answer comes back as a tool result."
      />

      <Section title="How it works">
        <P>
          In the <strong>Agents it can call</strong> section of the Agent tab you can attach
          any published agent in your workspace. Each link gets a description — that description
          is exactly what the calling model reads when deciding whether to invoke it.
        </P>
        <P>
          When the caller decides to use it, a fresh session is started for the target agent.
          It runs to completion (or until it pauses for approval), and its final answer is
          returned to the caller as a tool result. The caller then continues its own run with
          that information.
        </P>
        <P>
          Each linked agent appears as a tool named <C>call_agent_name</C>. The tool accepts a
          single <C>message</C> argument — whatever context the caller wants to pass.
        </P>
      </Section>

      <Section title="What the target agent receives">
        <P>
          The target sees a user message formatted as:{" "}
          <em>&ldquo;Agent &lsquo;Cancellations&rsquo; asks: [your message]&rdquo;</em>.
          This provenance framing helps the target understand who is asking and why, and makes
          the run trace readable.
        </P>
        <P>
          The target runs with its own tools, accounts, approval rules, and token budget — not
          the caller&rsquo;s. Attaching an agent as a call does not share any credentials.
        </P>
      </Section>

      <Section title="Publishing requirement">
        <P>
          Only published agents appear in the attachment list. If a target is later unpublished,
          its tool silently drops out of the caller&rsquo;s next run — the caller will not see
          it or try to use it.
        </P>
      </Section>

      <Section title="Approval pauses">
        <P>
          If the target agent hits a tool that requires owner approval, it pauses and waits.
          The caller immediately receives the message:
        </P>
        <Callout tone="warn">
          Agent &lsquo;Booking&rsquo; needs the owner&rsquo;s approval to continue. It will
          finish on its own after approval — proceed without its result.
        </Callout>
        <P>
          The caller should treat this as a soft failure and continue without the target&rsquo;s
          output. Once the owner approves, the target resumes independently.
        </P>
      </Section>

      <Section title="Depth limit">
        <P>
          A run started by another agent never gets <C>call_*</C> tools of its own. Depth is
          capped at 1 — A can call B, but B cannot call C (or A). This prevents infinite
          chains and deadlocks.
        </P>
      </Section>

      <Section title="Rate limit">
        <P>
          Each caller–target pair is limited to <strong>10 calls per hour</strong>. If the
          limit is reached the tool returns a clear message and the caller should not retry
          within the same run.
        </P>
      </Section>

      <Section title="Writing good descriptions">
        <List>
          <li>Be specific about what triggers the call: <em>&ldquo;Hand off when the customer mentions booking or cancelling an appointment — include their name and phone number.&rdquo;</em></li>
          <li>Tell the caller what to include in the message so the target has enough context to act.</li>
          <li>Avoid vague descriptions like &ldquo;Use when needed&rdquo; — the model needs to know <em>when</em> to call and <em>what</em> to pass.</li>
        </List>
      </Section>

      <Section title="When to use it — and when not to">
        <P>
          Start with a single capable agent. Add a second agent only when its specialisation
          genuinely helps — different tools, a different model, or a long sub-task that
          benefits from its own token budget and trace.
        </P>
        <P>
          Agent calls are not a substitute for instructions. If you can write a rule in the
          instructions that covers the case, do that first — it is faster, cheaper, and easier
          to debug.
        </P>
      </Section>

      {nextPage("/help/agent-calls") && (
        <NextUp href={nextPage("/help/agent-calls")!.href} title={nextPage("/help/agent-calls")!.title} />
      )}
    </>
  )
}
