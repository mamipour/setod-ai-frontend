import { Callout, DocHeader, List, NextUp, P, Section, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help - Skills" }

export default function SkillsHelp() {
  return (
    <>
      <DocHeader
        title="Skills"
        lede="Two different features share this page. A prompt skill is text added to an agent's instructions. A code skill is a Python function the agent calls like any other tool."
      />

      <Section title="Two kinds">
        <P>
          A prompt skill changes how an agent behaves. A code skill does work the agent
          cannot do with the connectors it already has: parse a file, call an API, calculate
          a date. They are attached in different places and they are not interchangeable.
        </P>
        <P>
          Code skills are next. Everything after that is prompt skills.
        </P>
      </Section>

      <Section id="code-skills" title="Code skills">
        <P>
          A code skill is a Python function you write, stored in your workspace, and published
          as its own isolated function. Once it is attached to an agent, the agent can call it
          like any other tool. The function must define <C>main(input, context)</C>.{" "}
          <C>input</C> is the arguments the agent passed. <C>context</C> includes the
          organisation, agent, and session ids.
        </P>
        <List>
          <li>Timeout is 1–30 seconds. The default is 10.</li>
          <li>Source, input, and output are each capped at 64 KB. The agent sees at most 16 KB of the result.</li>
          <li>An agent can call code skills at most 25 times in one run.</li>
          <li>Network access is off unless you turn it on. With it off, the function cannot open connections.</li>
          <li>Secrets are write-only. You can replace them, but the saved values are never shown again.</li>
          <li>Code skills are available on Pro and Business plans.</li>
        </List>
      </Section>

      <Section title="Prompt skills">
        <P>
          A prompt skill is a short prompt fragment stored in your workspace&apos;s Skills library.
          When you attach one to an agent, its text is injected into that agent&apos;s system
          prompt on every run — you do not need to copy anything into the instructions yourself.
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
          Go to <strong>Skills</strong> in the sidebar to see your prompt-skill library. From there
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

      <Section title="Writing a good prompt skill">
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
            <strong>Avoid duplicating connector logic.</strong> A prompt skill cannot call
            tools. It only tells the agent how to behave. Running your own code is a code
            skill, above.
          </li>
        </List>
      </Section>

      <NextUp page={nextPage("/help/skills")} />
    </>
  )
}
