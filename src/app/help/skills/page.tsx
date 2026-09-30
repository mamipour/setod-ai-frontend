import { Callout, DocHeader, List, NextUp, P, Section, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help - Skills" }

export default function SkillsHelp() {
  return (
    <>
      <DocHeader
        title="Skills"
        lede="Reusable behaviour rules that any agent can opt into — attach once, applied on every run."
      />

      <Section title="What a skill is">
        <P>
          A skill is a short prompt fragment stored in your workspace&apos;s Skills library.
          When you attach a skill to an agent, its text is automatically injected into that
          agent&apos;s system prompt on every run — you do not need to copy anything into
          the instructions yourself.
        </P>
        <P>
          Skills are meant to be narrow and reusable. A skill called &ldquo;Silence when
          idle&rdquo; does one thing: it tells the agent to end the run quietly when there
          is nothing to act on. The same skill can be attached to every agent in your
          workspace, saving you from writing that rule into each one individually.
        </P>
      </Section>

      <Section title="Default skills">
        <P>
          Every new workspace starts with eleven default skills across four categories:
        </P>
        <List>
          <li>
            <strong>Behaviour</strong> — Silence when idle, No duplicate actions, One action
            per run, Urgency first, After-hours notifications only, Escalate when unsure
          </li>
          <li>
            <strong>Output</strong> — Professional tone, Concise run summary
          </li>
          <li>
            <strong>Safety</strong> — No PII in summaries, Stop gracefully at budget
          </li>
          <li>
            <strong>Domain</strong> — Lead qualification
          </li>
        </List>
        <P>
          Default skills are fully editable. If &ldquo;professional tone&rdquo; is not the
          right voice for your business, edit the content to match what you actually want.
          Editing a skill updates it for every agent that has it attached.
        </P>
      </Section>

      <Section title="Attaching skills to an agent">
        <P>
          Open an agent, go to the <strong>Agent</strong> tab, and scroll down to the
          <strong> Skills</strong> section. Every skill in your library appears as a pill.
          Click a pill to attach it (it turns green); click again to detach. Changes take
          effect on the next run — no publish required.
        </P>
        <Callout>
          Skills are attached per-agent. Attaching &ldquo;Urgency first&rdquo; to one agent
          does not affect any other agent.
        </Callout>
      </Section>

      <Section title="Injection order">
        <P>
          When an agent runs, its system prompt is assembled in this order:
        </P>
        <List>
          <li>Platform safety preamble (always present, not editable)</li>
          <li>Agent instructions (the text from the Instructions box)</li>
          <li>Attached skills (each skill&apos;s content, in alphabetical order by category then name)</li>
          <li>Reasoning preamble (if the Reasoning setting is on)</li>
          <li>Episodic memory recall (if enabled)</li>
        </List>
        <P>
          Skills are injected after the agent&apos;s own instructions, so the instructions
          take precedence if they conflict with a skill. In practice, skills are designed to
          be additive — they cover concerns the instructions typically omit.
        </P>
      </Section>

      <Section title="Managing your library">
        <P>
          Go to <strong>Skills</strong> in the sidebar to see your full library. From there
          you can:
        </P>
        <List>
          <li>Preview the content of any skill by clicking <C>Preview</C></li>
          <li>Edit the name, tagline, category, or content of any skill</li>
          <li>Create a new skill with your own prompt fragment</li>
          <li>Delete a skill — agents that had it attached will simply stop receiving it</li>
        </List>
        <Callout>
          Deleting a skill removes it from all agents that had it attached. There is no
          confirmation on the agent side — it just stops being injected on the next run.
        </Callout>
      </Section>

      <Section title="Writing a good skill">
        <List>
          <li>
            <strong>One concern per skill.</strong> A skill that tries to handle tone, safety,
            and output format is harder to reuse and harder to reason about.
          </li>
          <li>
            <strong>Use imperative commands.</strong> &ldquo;Do not send more than one message
            per run&rdquo; is clearer than &ldquo;you should try to limit outbound
            messages.&rdquo;
          </li>
          <li>
            <strong>Keep it under 150 words.</strong> Longer fragments are harder for the
            model to follow reliably and use more tokens on every run.
          </li>
          <li>
            <strong>Avoid duplicating connector logic.</strong> Skills cannot call tools.
            They can only instruct the agent on how to behave — not what tools to use or
            how to authenticate.
          </li>
        </List>
      </Section>

      <NextUp page={nextPage("/help/skills")} />
    </>
  )
}
