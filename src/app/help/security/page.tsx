import Link from "next/link"
import { Callout, DocHeader, List, P, Section } from "@/components/help/doc"

export const metadata = { title: "Help  -  Security and what's missing" }

export default function SecurityHelp() {
  return (
    <>
      <DocHeader
        title="Security and what's missing"
        lede="What happens to your credentials and your content, and an honest list of what this platform does not do yet."
      />

      <Section title="Credentials">
        <P>
          Every token, API key and password you connect is encrypted before it is stored, and
          decrypted only at the moment a tool needs to make a call. They are never shown back
          to you in the interface and never included in a run transcript.
        </P>
        <P>
          You can revoke access from the other side at any time, and it takes effect
          immediately: remove the app from your Google account, revoke the bot token in
          BotFather, end the session in Telegram&apos;s device list, or roll the key in your
          OpenAI account.
        </P>
      </Section>

      <Section title="Where your content goes">
        <P>
          When an agent runs, the material it is working with  -  the emails it read, the
          messages it saw  -  is sent to <strong>your</strong> AI provider under{" "}
          <strong>your</strong> API key, and is governed by your agreement with them. It is
          not sent anywhere else, and it is not used to train anything here.
        </P>
        <P>
          Run transcripts are stored so you can audit what happened. They contain whatever
          the agent read and wrote, so treat them as being as sensitive as the accounts
          behind them.
        </P>
      </Section>

      <Callout tone="warn" title="Agents act with your authority">
        <p>
          An agent has exactly the permissions of the accounts you gave it, and it acts as
          you. It cannot tell a genuine customer email from one crafted to manipulate it, so
          be deliberate about which agents can send messages to the outside world, and read
          the first few runs of anything new. Responsibility for what your agents do rests
          with you  -  see the{" "}
          <Link href="/terms" className="underline underline-offset-4">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </Callout>

      <Section title="Platform security measures">
        <List>
          <li>
            <strong>Rate limiting.</strong> Authentication and agent-run endpoints are
            rate-limited per IP to prevent abuse. The auth endpoints allow 30 requests per
            minute; agent endpoints allow 30–60 depending on the operation.
          </li>
          <li>
            <strong>Security headers.</strong> Every response includes{" "}
            <code>X-Content-Type-Options: nosniff</code>,{" "}
            <code>X-Frame-Options: DENY</code>,{" "}
            <code>Referrer-Policy: strict-origin-when-cross-origin</code>, and{" "}
            <code>Strict-Transport-Security</code> on HTTPS.
          </li>
          <li>
            <strong>Session revocation.</strong> Logging out immediately invalidates your
            session token — if someone copies your cookie, it stops working the moment you
            sign out from any device.
          </li>
          <li>
            <strong>SSRF protection.</strong> URLs you provide for knowledge, MCP servers,
            and webhooks are validated to block requests to private networks, localhost, and
            cloud metadata endpoints before any connection is made.
          </li>
          <li>
            <strong>Custom code isolation.</strong> Custom code runs in an isolated AWS account
            with no permissions and no network unless you enable it.
          </li>
          <li>
            <strong>Voice WebSocket security.</strong> The WebSocket connection that handles
            live phone calls is protected by a short-lived HMAC-signed token — Twilio must
            present a valid token generated at call setup time, preventing unauthorised
            connections to the voice stream.
          </li>
        </List>
      </Section>

      <Section title="Still not built">
        <List>
          <li>
            <strong>Rich email.</strong> Sending is plain text only, with no formatting and
            no attachments.
          </li>
          <li>
            <strong>Full email bodies.</strong> Agents read sender, subject and a preview
            snippet, not the whole message.
          </li>
          <li>
            <strong>Manual reply delivery.</strong> The human takeover reply box records
            messages for context, but does not send them through the channel automatically.
            You still need to reply in Telegram, WhatsApp, etc. directly.
          </li>
        </List>
      </Section>

      <Section title="Now available">
        <List>
          <li>
            <strong>Message-arrival triggers.</strong> Agents can react the instant a
            message lands on Telegram, WhatsApp, Instagram, Twilio SMS, and inbound webhooks.
            Add a channel trigger on the agent&apos;s <em>When it runs</em> tab.
          </li>
          <li>
            <strong>Tool approvals.</strong> Require sign-off before an agent sends a message
            or takes any other action. Mark individual tools as "requires approval" on the
            agent's edit page — the agent pauses mid-run and waits until you approve or reject
            on the Approvals page. See the{" "}
            <a href="/help/approvals" className="underline underline-offset-4 hover:text-foreground">Tool approvals</a>{" "}
            help page for details.
          </li>
          <li>
            <strong>Voice / phone calls.</strong> Agents can now answer inbound phone calls
            via Twilio in real time, with a full call transcript saved to the Conversations
            inbox after each call.
          </li>
        </List>
      </Section>

      <Section title="Still stuck?">
        <P>
          Start with the run transcript  -  it answers most questions about what an agent did
          and why. If the behaviour still does not make sense after reading it, the
          instructions are the next place to look.
        </P>
      </Section>
    </>
  )
}
