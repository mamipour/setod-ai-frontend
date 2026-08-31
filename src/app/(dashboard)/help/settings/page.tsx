import { Callout, DocHeader, List, NextUp, P, Section, Table } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  Settings, cost and limits" }

export default function SettingsHelp() {
  return (
    <>
      <DocHeader
        title="Settings, cost and limits"
        lede="Each agent has its own settings. Nothing here is shared  -  turning web search on for one agent does not affect any other."
      />

      <Section title="Steps limit">
        <P>
          A step is one decision plus the tools called for it. An agent that reads mail,
          thinks, and sends one reply uses about three. The limit exists to stop a confused
          agent looping forever at your expense; hitting it ends the run as a failure.
        </P>
        <P>
          Ten suits most agents. Raise it when a run legitimately handles many items  - 
          triaging twenty emails needs more steps than triaging two. If an agent keeps
          hitting the ceiling, that is usually a sign the job is too broad rather than the
          limit being too low.
        </P>
      </Section>

      <Section title="Daily spending limit">
        <P>
          A cap on how much one agent may spend in a day. It is <strong>per agent</strong>  - 
          each has its own allowance, and a busy agent cannot exhaust a quiet one&apos;s
          budget. The count resets at midnight UTC.
        </P>
        <P>
          The check happens before each step, so a run that starts under the cap can finish
          slightly over it. Treat it as a guardrail against runaway loops, not an exact
          accounting limit.
        </P>
      </Section>

      <Section title="Think step by step">
        <P>
          Asks the model to reason through each decision before acting. Slower and slightly
          more expensive, and worth it when the agent has to exercise judgement over
          ambiguous text. For simple routing it mostly adds cost.
        </P>
      </Section>

      <Section title="Web search">
        <P>
          Gives the agent a search tool. No account or API key is needed. The results setting
          controls how much comes back on each search:
        </P>
        <Table
          head={["Setting", "Results per search"]}
          rows={[
            ["Low", "3  -  cheapest, fine for looking up a single fact"],
            ["Medium", "5  -  a reasonable default"],
            ["High", "10  -  for research where breadth matters"],
          ]}
        />
        <P>
          <strong>Read full pages</strong> adds a second tool that opens a URL and reads it,
          for when a snippet is not enough. It is slower and much heavier on tokens, which is
          why it is separate. Long content is truncated.
        </P>
        <P>
          It reads data files as well as pages. If a site publishes a CSV, JSON, or XML feed,
          point the agent at that instead of the page — it is cleaner, more complete, and far
          less likely to break when the site is redesigned. When the agent does read a page,
          links are kept alongside their text, so it can follow a list of results through to
          the individual entries rather than only seeing their titles.
        </P>
      </Section>

      <Section title="Remember past runs">
        <P>
          The agent finishes each run by writing itself a short note — which items it acted
          on, what it decided to skip — and the next few runs start with those notes in
          front of them. Because the agent chooses what goes in the note, it can carry
          forward exactly the identifiers it needs to avoid doing the same work twice.
        </P>
        <P>
          Notes are kept from the last five successful runs, newest first, up to a fixed
          size — so an agent that writes a lot pushes out its older notes rather than
          everything getting squeezed. Useful for agents that should notice a pattern across
          days or must not repeat themselves; unnecessary for agents where each run stands
          alone. Costs a small amount on every run.
        </P>
      </Section>

      <Section title="What things actually cost">
        <List>
          <li>
            <strong>AI tokens</strong> go to OpenAI or Anthropic on your own key, at their
            prices. The platform does not mark anything up.
          </li>
          <li>
            <strong>SMS</strong> goes to Twilio, per message.
          </li>
          <li>
            <strong>Gmail, Telegram and web search</strong> cost nothing.
          </li>
        </List>
        <P>
          The dollar figures shown around the app are estimates from token counts at typical
          prices. Your provider&apos;s bill is the real number.
        </P>
      </Section>

      <Callout tone="tip" title="Cheapest way to keep costs sane">
        <p>
          Run less often. An agent polling every 15 minutes costs four times one polling
          hourly, and for most inbox work hourly is indistinguishable in practice. Check the
          schedule before reaching for a smaller model.
        </p>
      </Callout>

      <NextUp {...nextPage("/help/settings")!} />
    </>
  )
}
