import { Callout, DocHeader, List, NextUp, P, Section, Table } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  Runs and troubleshooting" }

export default function RunsHelp() {
  return (
    <>
      <DocHeader
        title="Runs and troubleshooting"
        lede="Every run is recorded in full. When an agent does something you did not expect, the transcript almost always shows you why."
      />

      <Section title="Reading a transcript">
        <P>
          A run is a conversation. It opens with the instruction that woke the agent up, then
          alternates between what the model said and what its tools returned. Reading it top
          to bottom shows you the agent&apos;s reasoning and the evidence it was working
          from.
        </P>
        <List>
          <li>
            <strong>Steps</strong> counts how many times the agent thought and acted. One
            step covers a single decision plus all the tools it called for it.
          </li>
          <li>
            <strong>Tokens</strong> is what the run cost at your AI provider.
          </li>
          <li>
            <strong>Tool rows</strong> show exactly what came back. This is where you find
            out that an email the agent ignored never actually reached it.
          </li>
        </List>
      </Section>

      <Section title="Why an agent did nothing">
        <P>
          This is the most common complaint and it is usually not a failure. The run
          succeeded, the agent looked, and it decided nothing matched. Check in this order:
        </P>
        <List>
          <li>
            <strong>Were there really new items?</strong> An agent will not show you mail it
            already handled on an earlier run.
          </li>
          <li>
            <strong>Are the instructions specific enough?</strong> Agents are told to do
            nothing when in doubt, so anything vague resolves to inaction.
          </li>
          <li>
            <strong>Does it have the tool it needs?</strong> If a connector went inactive,
            its tools quietly disappear and the agent runs without them.
          </li>
        </List>
      </Section>

      <Callout tone="warn" title="A broken connector does not fail the run">
        <p>
          If a connector is disconnected or needs re-authorising, its tools are simply left
          out. The agent still runs, still succeeds, and just does less  -  with no error to
          alert you. If an agent has gone quiet, check the Connectors page before rewriting
          any instructions.
        </p>
      </Callout>

      <Section title="Every failure message">
        <Table
          head={["What it says", "What to do"]}
          rows={[
            [
              "Daily token budget reached for this agent",
              "It hit the spending cap you set. Runs resume after midnight UTC, or raise the limit in Settings.",
            ],
            [
              "Stopped after N steps without finishing",
              "The agent kept working and ran out of steps. Usually too much in one job  -  narrow the instructions, or raise the step limit in Settings.",
            ],
            [
              "This agent has no AI model selected",
              "Pick a brain and model on the agent's main tab.",
            ],
            [
              "The selected AI model connector no longer exists",
              "The API key connector was deleted. Add it again and reselect it.",
            ],
            [
              "This connector needs reconnecting",
              "The AI provider key was revoked or is invalid. Reconnect it on the Connectors page.",
            ],
            [
              "OpenAI: … / Anthropic: …",
              "The message comes straight from the provider. Common causes are an expired key, no credit on the account, a rate limit, or a model your key cannot access.",
            ],
            [
              "The worker running this agent stopped unexpectedly",
              "The run was interrupted  -  usually a restart. The next scheduled run proceeds normally. Anything already sent stays sent.",
            ],
            [
              "This agent has not been published yet",
              "Something asked for the live version of an agent that has never been published. Publish it, or use a test run.",
            ],
          ]}
        />
      </Section>

      <Section title="When an agent did something you did not want">
        <P>
          Unpublish it first  -  that stops the schedule immediately. Then read the transcript
          to find the step where it went wrong, fix the instructions, test, and publish
          again. Actions that already happened cannot be undone from here: a sent email is
          sent. Where it matters, put the limit in the instructions before the next run
          rather than after.
        </P>
      </Section>

      <NextUp {...nextPage("/help/runs")!} />
    </>
  )
}
