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

      <Section title="Inbound Webhook" id="webhook">
        <P>
          Any external system — a form, a Shopify store, a custom script — can trigger an
          agent by making an HTTP POST request to a unique URL. Click <strong>Connect</strong>
          on the Inbound Webhook card to generate a URL and a signing secret.
        </P>
        <List>
          <li>The URL and secret are shown once. Copy both before closing the dialog.</li>
          <li>
            If you lose the secret, click <strong>Regenerate</strong> on the connector row.
            The old secret stops working immediately.
          </li>
          <li>
            To verify requests come from the right source, the sender should include an{" "}
            <C>X-Hub-Signature-256: sha256=&lt;hex&gt;</C> header signed with the secret.
            Requests without a valid signature are rejected when a secret is set.
          </li>
        </List>
        <P>
          The agent receives the full JSON body of the POST as its trigger message. The
          payload is pretty-printed and capped at 4 000 characters.
        </P>
      </Section>

      <Section title="Slack" id="slack">
        <P>
          Lets an agent post messages to a Slack channel using an Incoming Webhook URL.
        </P>
        <Steps>
          <li>In Slack, go to <strong>Apps → Incoming Webhooks</strong> and install it if you have not already.</li>
          <li>Create a new webhook for the channel you want and copy the URL.</li>
          <li>Paste it into the Slack connector form. A test message is sent immediately to confirm.</li>
        </Steps>
        <P>
          The tool is called <C>post_to_slack</C>. It sends plain text and basic Slack
          markdown (*bold*, _italic_, `code`).
        </P>
      </Section>

      <Section title="Google Sheets" id="google-sheets">
        <P>
          Lets an agent read and write Google Sheets using a service account — a special
          Google account that authenticates without OAuth and never expires.
        </P>
        <Steps>
          <li>In Google Cloud Console, create a project and enable the <strong>Google Sheets API</strong>.</li>
          <li>Create a <strong>Service Account</strong> and generate a JSON key.</li>
          <li>Copy the service-account email from the key (it ends in <C>@…gserviceaccount.com</C>).</li>
          <li>Share any spreadsheet you want the agent to access with that email address (View or Editor as needed).</li>
          <li>Paste the full JSON key into the Google Sheets connector form.</li>
        </Steps>
        <P>
          The connector card shows the service-account email so you can share new
          spreadsheets with it at any time. Tools: <C>read_rows</C>, <C>append_row</C>,{" "}
          <C>update_cell</C>.
        </P>
      </Section>

      <Section title="WhatsApp Business" id="whatsapp">
        <P>
          Connects to Meta&apos;s WhatsApp Cloud API so agents can send and receive messages
          on your WhatsApp Business number.
        </P>
        <Steps>
          <li>In <a href="https://business.facebook.com" target="_blank" rel="noreferrer" className="underline underline-offset-2">Meta Business Manager</a>, open <strong>WhatsApp → API Setup</strong> and copy the <strong>Phone Number ID</strong>.</li>
          <li>Generate a permanent system-user access token (not a temporary one).</li>
          <li>Choose a <strong>Verify Token</strong> — any string you like, e.g. <C>my-setod-token</C>.</li>
          <li>Fill in the connector form. The platform validates the credentials with Meta.</li>
          <li>In Meta&apos;s webhook config, set the callback URL to the one shown on the connector card and enter the same Verify Token.</li>
        </Steps>
        <Callout tone="warn" title="The 24-hour customer service window">
          <p>
            WhatsApp allows free-form replies only within 24 hours of the customer&apos;s
            last message. After that, only pre-approved template messages may be sent. The
            platform surfaces a clear error when the window has closed so the agent can
            inform the human rather than silently fail.
          </p>
        </Callout>
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
