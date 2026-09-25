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

      <Callout tone="info" title="Preview mode — nothing is sent">
        <p>
          The <strong>Preview</strong> button (eye icon) runs the draft in dry-run mode.
          Every tool call that would write something — send an email, post to Slack, send
          a WhatsApp — is simulated instead. The transcript shows what <em>would</em> have
          happened, with each simulated action labelled in amber. Read tools (reading mail,
          reading a spreadsheet) still execute normally so you see realistic data.
        </p>
        <p className="mt-2">
          Use this to check new instructions before publishing. No accounts are touched and
          nothing costs money.
        </p>
      </Callout>

      <Callout tone="warn" title="Live runs are real">
        <p>
          The <strong>Run</strong> button is live — emails are sent, messages go out, texts
          cost money. The only thing it changes compared to a scheduled run is <em>which
          version</em> runs: the draft rather than the published snapshot.
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

      <Section title="Pausing and resuming">
        <P>
          Pausing is a softer stop than unpublishing. A paused agent keeps its published
          snapshot intact — it just skips every scheduled and message-triggered run until
          you resume it. The amber <strong>Paused</strong> badge appears on the card and in
          the header.
        </P>
        <List>
          <li>
            <strong>Pause</strong> — available on any live (published) agent. The agent
            keeps its configuration; nothing is lost.
          </li>
          <li>
            <strong>Resume</strong> — returns the agent to live immediately, using the same
            published snapshot. No new publish step required.
          </li>
          <li>
            <strong>Unpublish</strong> — clears the published snapshot entirely. You will
            need to publish again before the agent can run on its own.
          </li>
        </List>
        <P>
          Use Pause when you need the agent to go quiet for a day or a week and you plan to
          resume it unchanged. Use Unpublish when you want to rework the agent properly
          before it runs again.
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
