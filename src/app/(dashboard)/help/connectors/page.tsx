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

      <Section title="HubSpot" id="hubspot">
        <P>
          Connects to HubSpot CRM using a <strong>Private App token</strong>. Go to{" "}
          <strong>Settings → Integrations → Private apps</strong>, create a private app,
          and enable scopes: <C>crm.objects.contacts.read/write</C>,{" "}
          <C>crm.objects.deals.read/write</C>, <C>crm.objects.notes.read/write</C>.
          Copy the generated token and paste it into the connector form.
        </P>
        <P>
          Tools: <C>find_hubspot_contact</C>, <C>create_hubspot_contact</C>,{" "}
          <C>update_hubspot_contact</C>, <C>create_hubspot_deal</C>,{" "}
          <C>move_hubspot_deal</C>, <C>log_hubspot_note</C>,{" "}
          <C>list_hubspot_pipeline_stages</C>.
        </P>
      </Section>

      <Section title="Pipedrive" id="pipedrive">
        <P>
          Connects to Pipedrive using your API token. Go to{" "}
          <strong>Settings → Personal preferences → API</strong> and copy the token.
        </P>
        <P>
          Tools: <C>find_pipedrive_person</C>, <C>create_pipedrive_person</C>,{" "}
          <C>update_pipedrive_person</C>, <C>create_pipedrive_deal</C>,{" "}
          <C>move_pipedrive_deal</C>, <C>log_pipedrive_activity</C>,{" "}
          <C>list_pipedrive_stages</C>.
        </P>
      </Section>

      <Section title="Notion" id="notion">
        <P>
          Connects via an <strong>Internal Integration Secret</strong>. Create the
          integration at{" "}
          <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="underline underline-offset-2">notion.so/my-integrations</a>{" "}
          with Read/Update/Insert content capabilities. After creating it, you must share
          each page or database with the integration from Notion&apos;s{" "}
          <strong>⋯ → Connections</strong> menu — the agent can only see pages you have
          explicitly shared.
        </P>
        <P>
          Tools: <C>search_notion</C>, <C>get_notion_page</C>,{" "}
          <C>query_notion_database</C>, <C>create_notion_page</C>,{" "}
          <C>update_notion_page</C>, <C>append_notion_content</C>.
        </P>
        <Callout tone="info" title="Share pages first">
          <p>
            If the agent says &quot;no results&quot; or &quot;not found&quot;, it most likely
            means the page was not shared with the integration. Open the page in Notion,
            click ⋯ → Connections, and add your integration there.
          </p>
        </Callout>
      </Section>

      <Section title="Airtable" id="airtable">
        <P>
          Connects using a <strong>Personal Access Token (PAT)</strong>. Create one at{" "}
          <a href="https://airtable.com/create/tokens" target="_blank" rel="noreferrer" className="underline underline-offset-2">airtable.com/create/tokens</a>.
          Required scopes: <C>schema.bases:read</C>, <C>data.records:read</C>,{" "}
          <C>data.records:write</C>. Under <strong>Access</strong>, add the specific bases
          you want the agent to access.
        </P>
        <P>
          Tools: <C>list_airtable_bases</C>, <C>list_airtable_records</C>,{" "}
          <C>find_airtable_record</C> (uses Airtable formula syntax), <C>create_airtable_record</C>,{" "}
          <C>update_airtable_record</C> (PATCH — unmentioned fields are preserved).
        </P>
      </Section>

      <Section title="Shopify" id="shopify">
        <P>
          Uses a <strong>Custom App token</strong> — no OAuth, no partner account needed.
          In your Shopify admin, go to <strong>Settings → Apps → Develop apps</strong>,
          create an app, and configure these Admin API scopes:{" "}
          <C>read_orders</C>, <C>read_customers</C>, <C>read_products</C>, <C>write_orders</C>.
          After installing the app, copy the <strong>Admin API access token</strong> (starts
          with <C>shpat_</C>).
        </P>
        <P>
          The connector also needs your store&apos;s <strong>myshopify.com domain</strong>{" "}
          (e.g. <C>mystore.myshopify.com</C>). Both fields are required.
        </P>
        <P>
          Tools: <C>get_shopify_order</C>, <C>list_shopify_orders</C>,{" "}
          <C>search_shopify_customer</C>, <C>list_shopify_products</C>,{" "}
          <C>get_shopify_product</C>, <C>add_shopify_order_note</C>,{" "}
          <C>cancel_shopify_order</C>.
        </P>
        <Callout tone="warn" title="Custom App vs Public App">
          <p>
            This connector uses the Custom App approach, which only works for connecting
            your own store. If you need to connect multiple different stores (SaaS
            scenario), you would need a Public App with OAuth — contact us.
          </p>
        </Callout>
      </Section>

      <Section title="Google Business Profile" id="google-business-profile">
        <P>
          Connects via Google OAuth with the <C>business.manage</C> scope. Click{" "}
          <strong>Connect with Google</strong> and authorise the account that is an owner
          or manager of your Google Business Profile location.
        </P>
        <Callout tone="warn" title="Requirements">
          <p>
            Your Google account must be an <strong>owner or manager</strong> of the GBP
            location, and the location must be <strong>verified on Google</strong>. Unverified
            locations do not appear in the reviews API.
          </p>
        </Callout>
        <P>
          Tools: <C>list_gbp_locations</C> (call this first to get the location id),{" "}
          <C>list_gbp_reviews</C>, <C>reply_to_gbp_review</C>,{" "}
          <C>delete_gbp_reply</C>.
        </P>
        <P>
          A typical Review Responder agent runs on a schedule (e.g. every hour),
          calls <C>list_gbp_reviews</C> to find unanswered reviews, drafts a reply,
          and calls <C>reply_to_gbp_review</C> for each. Human approval can be added
          before replies go live.
        </P>
      </Section>

      <Section title="Calendly" id="calendly">
        <P>
          Connects using a <strong>Personal Access Token (PAT)</strong>. Go to{" "}
          <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noreferrer" className="underline underline-offset-2">calendly.com/integrations/api_webhooks</a>{" "}
          and generate a new token. When creating it, enable these scopes:{" "}
          <C>event_types:read</C>, <C>scheduled_events:read</C>, <C>scheduled_events:write</C>,{" "}
          <C>invitees:write</C>, <C>scheduling_links:write</C>. The token is shown once — copy
          it immediately. Legacy tokens (created before scoped permissions) have full access
          without selecting scopes.
        </P>
        <P>
          Tools: <C>list_calendly_event_types</C> (returns scheduling URLs too),{" "}
          <C>get_calendly_availability</C> (open slots for a date range),{" "}
          <C>list_calendly_events</C>, <C>get_calendly_event</C>,{" "}
          <C>create_calendly_booking</C>, <C>cancel_calendly_event</C>,{" "}
          <C>create_scheduling_link</C>.
        </P>
        <Callout tone="warn" title="Programmatic booking requires a paid plan">
          <p>
            <C>create_calendly_booking</C> (booking on behalf of an invitee without a
            redirect) requires a Calendly Professional plan or above. On a free plan the
            tool returns a clear error. Use <C>create_scheduling_link</C> instead — it
            generates a single-use URL you can send in a message, and works on all plans.
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
