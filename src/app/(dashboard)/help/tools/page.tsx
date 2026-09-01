import { Callout, DocHeader, NextUp, P, Section, Table, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  Tool reference" }

export default function ToolsHelp() {
  return (
    <>
      <DocHeader
        title="Tool reference"
        lede="Every action an agent can take. Each tool pill has three states: on (blue), requires approval (amber), or off. See the Tool approvals page for how the approval flow works."
      />

      <Section title="Google (Gmail and Calendar)">
        <Table
          head={["Tool", "What it does"]}
          rows={[
            [
              <C key="a">read_unread_emails</C>,
              "Lists unread inbox mail: sender, subject, date and a short preview snippet. Only considers mail received on or after the day the agent was created — older unread messages are out of scope. Skips anything this agent already handled, and tells you how many it skipped. Does not include the full body or attachments.",
            ],
            [
              <C key="b">search_emails</C>,
              <>
                Searches with Gmail syntax such as <C>from:bob after:2026/01/01</C>. Unlike
                reading unread mail, this returns everything that matches  - {" "}
                <strong>including messages already handled</strong>.
              </>,
            ],
            [<C key="c">send_email</C>, "Sends a new plain-text email. No formatting, no attachments."],
            [
              <C key="d">reply_to_email</C>,
              "Replies to a message in its existing thread, so the conversation stays together.",
            ],
            [
              <C key="e">archive_email</C>,
              "Removes a message from the inbox. It is not deleted and stays in All Mail.",
            ],
            [
              <C key="f">list_calendar_events</C>,
              "Lists events on the primary Google Calendar between two dates. Defaults to today.",
            ],
            [
              <C key="g">create_calendar_event</C>,
              "Creates an event on the primary calendar. Optional attendees get a Google invite.",
            ],
          ]}
        />
      </Section>

      <Section title="Telegram Bot">
        <Table
          head={["Tool", "What it does"]}
          rows={[
            [
              <C key="a">send_telegram_message</C>,
              "Sends a message to the one chat that was linked at setup. It cannot choose a recipient.",
            ],
          ]}
        />
      </Section>

      <Section title="Telegram Account">
        <Table
          head={["Tool", "What it does"]}
          rows={[
            [
              <C key="a">send_telegram_message</C>,
              "Sends a message to any username or phone number, as you.",
            ],
            [
              <C key="b">read_telegram_messages</C>,
              "Lists chats with unread messages and a preview of the latest one. Skips chats already handled on an earlier run.",
            ],
          ]}
        />
      </Section>

      <Section title="Twilio">
        <Table
          head={["Tool", "What it does"]}
          rows={[
            [
              <C key="a">send_sms</C>,
              <>
                Sends an SMS from your Twilio number. Recipients must be in international
                format, like <C>+14155551234</C>. Every message costs you money.
              </>,
            ],
          ]}
        />
      </Section>

      <Section title="MCP servers">
        <P>
          Tools come from the frozen list on the connector  -  names and arguments depend on
          the server (GitHub, Linear, Notion, or a custom URL). Attach the connector on the
          Agent tab and enable the pills you want. Write-like names start as requiring
          approval. See the <a href="/help/mcp" className="underline underline-offset-2">MCP servers</a> page.
        </P>
      </Section>

      <Section title="Web search">
        <P>
          These two are different from the rest: there is no account to connect. Turn them on
          per agent under Settings, and they appear automatically.
        </P>
        <Table
          head={["Tool", "What it does"]}
          rows={[
            [
              <C key="a">search_web</C>,
              "Searches the web and returns titles, links and short snippets. Appears when Web search is on. How many results come back depends on your results setting.",
            ],
            [
              <C key="b">fetch_page</C>,
              "Reads a URL. Web pages come back as text with the markup stripped and every link kept as 'label (url)', so the agent can follow a listing through to its detail pages. Data files — CSV, JSON, XML — come back as-is, which is usually the better source when a site publishes one. Long content is truncated. Only appears when Read full pages is also on.",
            ],
          ]}
        />
      </Section>

      <Section title="Knowledge">
        <P>
          Appears automatically once the agent has at least one indexed document on its
          Knowledge tab. No document, no tool.
        </P>
        <Table
          head={["Tool", "What it does"]}
          rows={[
            [
              <C key="a">search_knowledge</C>,
              "Searches the documents uploaded to this agent and returns the best-matching passages with the file each came from.",
            ],
          ]}
        />
      </Section>

      <Callout tone="info" title="Two accounts of the same kind">
        <p>
          If an agent has two Gmail accounts attached, the tool names get a suffix so the
          model can tell them apart  -  <C>send_email_sales</C> and <C>send_email_support</C>.
          Mention the account in your instructions when this happens.
        </p>
      </Callout>

      <Callout tone="warn" title="A failing tool does not stop the run">
        <p>
          When a tool errors, the error text is handed back to the model as the result and
          the run continues. That is usually what you want  -  a temporary Gmail hiccup should
          not abandon the whole job  -  but it does mean a run can finish as &ldquo;succeeded&rdquo;
          having quietly failed at something. The transcript shows the error.
        </p>
      </Callout>

      <NextUp {...nextPage("/help/tools")!} />
    </>
  )
}
