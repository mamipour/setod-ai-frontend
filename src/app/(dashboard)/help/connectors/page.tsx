import { Callout, DocHeader, List, NextUp, P, Section, Steps, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  Connecting accounts" }

export default function ConnectorsHelp() {
  return (
    <>
      <DocHeader
        title="Connecting accounts"
        lede="A connector is one account the platform holds credentials for. Connect it once and any agent in the workspace can be given access to it."
      />

      <Callout tone="info">
        <p>
          Connectors belong to the workspace, not to an agent. Attaching one to an agent
          grants access; it does not copy anything. Deleting a connector affects every agent
          using it.
        </p>
      </Callout>

      <Section title="Google (Gmail and Calendar)" id="gmail">
        <P>
          Connect through Google&apos;s consent screen  -  the platform never sees your
          password. You will be asked to grant permission to read and send mail, and to
          read and create events on your primary calendar. Same Google Cloud app as before.
        </P>
        <P>
          <strong>Mail.</strong> Unread mail returns sender, subject, date and Gmail&apos;s
          short preview snippet  -  not the full body or attachments. The agent can send
          plain-text mail, reply in-thread, and archive (remove from inbox, not delete).
        </P>
        <P>
          <strong>Calendar.</strong> List events between two dates, and create events
          (optionally inviting attendees). Times use the calendar&apos;s timezone unless the
          agent sets one. If you connected Gmail before Calendar existed, reconnect so Google
          can grant the new permission. Enable the Calendar API on the Cloud project if Test
          says it is missing.
        </P>
        <P>
          <strong>If it breaks.</strong> Access refreshes itself in the background. If you
          revoke access from your Google account, or leave it untouched for a very long time,
          the connector turns red and its agents lose those tools. Reconnect from the
          Connectors page.
        </P>
      </Section>

      <Section title="Telegram Bot" id="telegram-bot">
        <P>
          A bot you create yourself through @BotFather in Telegram. Paste the token it gives
          you, then send your bot a message so it can learn which chat to talk to.
        </P>
        <Callout tone="warn" title="A bot can only message one chat">
          <p>
            The chat you linked at setup is the only place the bot can send to. It cannot
            message your customers, and it cannot start a conversation with someone who has
            not written to it first. Treat a bot as a notification channel for yourself or
            your team, not as a way to reach the outside world.
          </p>
        </Callout>
      </Section>

      <Section title="Telegram Account" id="telegram-account">
        <P>
          This logs in as <em>you</em>, using your phone number and a code Telegram sends you
          (plus your two-step password, if you have one set). Because it acts as your real
          account, it can read and reply to ordinary conversations the way you would.
        </P>
        <List>
          <li>
            You can end the session at any time from Telegram itself, under Settings →
            Devices → Active Sessions. Doing so immediately breaks the connector.
          </li>
          <li>
            Telegram rate-limits accounts that send a lot of messages quickly, and automated
            use of a personal account is a grey area in their terms. Keep the volume modest.
          </li>
        </List>
      </Section>

      <Section title="Twilio" id="twilio">
        <P>
          Paste your Account SID, Auth Token and the Twilio phone number you want messages to
          come from. Every number  -  the sender and every recipient  -  must be in international
          format with the country code, like <C>+14155551234</C>.
        </P>
        <P>
          Twilio charges you per message sent. An agent with a bug and a schedule can become
          expensive here faster than anywhere else on the platform, so keep the daily budget
          low while you are still testing.
        </P>
      </Section>

      <Section title="OpenAI and Anthropic" id="ai">
        <P>
          These are the agent&apos;s brain rather than something it acts on, and one of them
          is required. Paste an API key from your own account; the model dropdown then loads
          the live list of models that key can use, so it never offers you something that has
          been retired.
        </P>
        <P>
          You are billed by OpenAI or Anthropic directly, at their prices. The platform does
          not resell tokens or mark anything up.
        </P>
      </Section>

      <Section title="MCP servers" id="mcp">
        <P>
          Remote HTTPS tool servers (GitHub, Linear, Notion, Slack, Atlassian, Zapier, or a
          URL you run). Auth is probed — OAuth, a pasted token, or none. The tool list is
          frozen on connect. See <a href="/help/mcp" className="underline underline-offset-2">MCP servers</a> for the full rules.
        </P>
      </Section>

      <Section title="Removing a connector">
        <P>
          If an agent is using it, you will be told which agents before anything is deleted.
          A deleted connector takes its tools away from those agents  -  they keep running, but
          with fewer abilities, which usually means they quietly stop being useful. Detach it
          from the agents first if that is not what you want.
        </P>
      </Section>

      <NextUp {...nextPage("/help/connectors")!} />
    </>
  )
}
