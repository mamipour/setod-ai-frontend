import { Callout, DocHeader, List, NextUp, P, Section, Steps } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  Testing and publishing" }

export default function PublishingHelp() {
  return (
    <>
      <DocHeader
        title="Testing and publishing"
        lede="Every agent has two versions: the draft you are editing and the published snapshot that actually runs. Understanding the split is what lets you edit a live agent without fear."
      />

      <Callout tone="warn" title="Test runs are real">
        <p>
          There is no sandbox and nothing is simulated. When you press Test run, the agent
          uses your real accounts  -  emails are sent, messages go out, texts cost money. The
          only thing a test run changes is <em>which version</em> of the agent runs.
        </p>
      </Callout>

      <Section title="Draft and published">
        <List>
          <li>
            <strong>The draft</strong> is what you see in the builder. Every edit saves here
            immediately.
          </li>
          <li>
            <strong>The published snapshot</strong> is a frozen copy taken at the moment you
            pressed Publish. Scheduled runs use this and nothing else.
          </li>
        </List>
        <P>
          So you can rewrite the instructions of a live agent in the middle of the day, and
          the version running on the schedule stays exactly as it was until you decide to
          publish. When the two differ, the agent shows an unpublished-changes marker.
        </P>
      </Section>

      <Section title="Which version runs when">
        <List>
          <li>
            <strong>Test run</strong>  -  the draft. This is the point: you are checking the
            edit you just made.
          </li>
          <li>
            <strong>Scheduled run</strong>  -  the published snapshot, always.
          </li>
        </List>
      </Section>

      <Section title="Publishing">
        <P>Two things must be true before an agent can be published:</P>
        <Steps>
          <li>An AI model is selected.</li>
          <li>The instructions are not empty.</li>
        </Steps>
        <P>
          Publishing takes the snapshot and marks the agent live. Its schedule starts firing
          from the next occurrence. Note that connectors are <em>not</em> part of the
          snapshot  -  attaching or detaching an account takes effect on the very next run,
          published or not.
        </P>
      </Section>

      <Section title="Unpublishing">
        <P>
          Unpublishing takes the agent off its schedule and puts it back into draft. Nothing
          is lost  -  the instructions, tools and triggers all stay, they just stop running by
          themselves. This is the right move when an agent is misbehaving and you need it to
          stop now.
        </P>
      </Section>

      <Section title="A sensible first-run routine">
        <Steps>
          <li>Set the daily budget low while you are still experimenting.</li>
          <li>
            Write instructions that report rather than act  -  &ldquo;tell me what you would
            do&rdquo;  -  and test those first.
          </li>
          <li>Read the transcript. Check it looked at the right things.</li>
          <li>Change the instructions to actually act, and test again.</li>
          <li>Publish, then watch the first two or three scheduled runs.</li>
        </Steps>
      </Section>

      <NextUp {...nextPage("/help/publishing")!} />
    </>
  )
}
