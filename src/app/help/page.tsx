import { Callout, DocHeader, List, NextUp, P, Section, Steps, C } from "@/components/help/doc"
import { nextPage } from "./nav"

export const metadata = { title: "Help  -  Start here" }

export default function HelpIndex() {
  return (
    <>
      <DocHeader
        title="Start here"
        lede="An agent is a set of written instructions, a few accounts it is allowed to use, and a schedule that decides when it wakes up. Everything else on this platform exists to serve those three things."
      />

      <Section title="How it fits together">
        <P>
          You connect an account once  -  a Gmail inbox, a Telegram bot, a phone number. That
          account then becomes available to every agent in your workspace. When you build an
          agent, you pick which of those accounts it may use, write instructions telling it
          what to do, and choose how often it should run. When it runs, an AI model reads
          your instructions, looks at whatever the accounts show it, and takes actions on
          your behalf.
        </P>
      </Section>

      <Section title="The five words that matter">
        <List>
          <li>
            <strong>Connector</strong>  -  one connected account. Shared across the whole
            workspace, set up once.
          </li>
          <li>
            <strong>Tool</strong>  -  one thing an agent can do with a connector, like{" "}
            <C>send_email</C> or <C>read_unread_emails</C>. You do not create tools; attaching
            a connector grants its whole set.
          </li>
          <li>
            <strong>Agent</strong>  -  instructions plus connectors plus a trigger.
          </li>
          <li>
            <strong>Trigger</strong>  -  what wakes the agent up. Today that means a schedule,
            or you pressing the button yourself.
          </li>
          <li>
            <strong>Run</strong>  -  one execution, recorded in full so you can read back
            exactly what the agent thought and did.
          </li>
        </List>
      </Section>

      <Section title="Getting your first agent working">
        <Steps>
          <li>
            <strong>Connect an AI provider.</strong> On the Connectors page, add an OpenAI or
            Anthropic API key. Nothing can run without one  -  this is the agent&apos;s brain,
            and it is billed to you by them directly.
          </li>
          <li>
            <strong>Connect something for it to act on.</strong> Gmail, a Telegram bot,
            Twilio, or an MCP server. An agent with a brain but no accounts can think and say things, but
            cannot do anything.
          </li>
          <li>
            <strong>Create an agent.</strong> The <strong>Templates</strong> page has
            ready-made agents for common jobs, grouped by what they are for - pick one, read
            its instructions, and press <em>Use template</em>. Everything is editable before
            it is created. Or start from scratch on the Agents page and write what you want
            it to do in plain English.
          </li>
          <li>
            <strong>Test it.</strong> Press Test run and read the transcript line by line.
          </li>
          <li>
            <strong>Publish it.</strong> Until you publish, the agent never runs on its own.
          </li>
        </Steps>
      </Section>

      <Callout tone="warn" title="A test run is a real run">
        <p>
          Pressing Test run does not simulate anything. It uses your connected accounts and
          genuinely sends whatever the agent decides to send. Write cautious instructions
          before the first test, not after.
        </p>
      </Callout>

      <Section title="Two things worth knowing early">
        <List>
          <li>
            <strong>Editing a live agent is safe.</strong> Your edits go to a draft. What runs
            on the schedule keeps being the last version you published, until you publish
            again.
          </li>
          <li>
            <strong>Agents do not re-do work.</strong> An agent polling your inbox every
            30 minutes sees the same unread mail every time, but the platform tracks what it
            has already handled so it does not reply twice.
          </li>
        </List>
      </Section>

      <NextUp {...nextPage("/help")!} />
    </>
  )
}
