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

      <Section title="Gmail and Google Calendar" id="gmail">
        <P>
          Uses a Google App Password  -  a 16-character credential you generate from your Google
          Account. The platform connects directly over IMAP (read mail) and SMTP (send mail), and
          CalDAV (calendar). No Google consent screen, no expiring tokens.
        </P>
        <Steps>
          <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline underline-offset-2">myaccount.google.com/security</a> and make sure <strong>2-Step Verification</strong> is turned on.</li>
          <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline underline-offset-2">myaccount.google.com/apppasswords</a>, select <strong>Mail</strong>, click <strong>Generate</strong>.</li>
          <li>Copy the 16-character password and paste it into the connector form along with your Gmail address.</li>
        </Steps>
        <Callout tone="warn" title="Google Workspace accounts">
          <p>
            If your email ends in a company domain (not @gmail.com), the App Passwords page may
            say the setting is not available. Your Google Workspace admin must enable it under
            Admin Console → Security → Less secure apps.
          </p>
        </Callout>
        <P>
          <strong>Mail.</strong> Agents can read unread inbox messages (with full body content),
          search mail, send new messages, reply in-thread, and archive emails (removed from inbox,
          never deleted).
        </P>
        <P>
          <strong>Calendar.</strong> List events between two dates and create new events,
          optionally with attendees. Times use the calendar&apos;s default timezone unless the
          agent specifies one.
        </P>
        <P>
          <strong>If it breaks.</strong> The App Password never expires on its own. If you
          delete the App Password from your Google Account, or change your Google password,
          the connector will fail. Generate a new App Password and reconnect from the
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
