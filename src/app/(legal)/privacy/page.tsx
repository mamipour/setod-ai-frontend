export const metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Last updated: September 25, 2026</p>

      <p>
        This Privacy Policy explains what data this platform (the &quot;Service&quot;) collects,
        how it is used, and the choices you have. By using the Service you consent to the
        practices described here.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account information.</strong> When you sign in with Google we receive your
          name, email address, and profile picture.
        </li>
        <li>
          <strong>Connector credentials.</strong> API keys, OAuth tokens, and bot tokens for the
          services you connect. These are encrypted at rest and used only to perform the actions
          your agents request.
        </li>
        <li>
          <strong>Agent configuration.</strong> The names, instructions, schedules, and settings
          of the agents you create.
        </li>
        <li>
          <strong>Run history.</strong> A log of each agent run, including the messages exchanged
          with the AI model and the tool actions taken. This exists so you can audit what your
          agents did.
        </li>
      </ul>

      <h2>2. Content that passes through your agents</h2>
      <p>
        When an agent runs, content from your connected accounts (emails, chat messages, SMS) is
        read by the agent and sent to the AI provider <strong>you</strong> configured (such as
        OpenAI or Anthropic) using <strong>your</strong> API key. That content is processed under
        the AI provider&apos;s own terms and privacy policy  -  we do not control what those
        providers do with it. Review their policies before connecting an account.
      </p>

      <h2>3. How we use data</h2>
      <ul>
        <li>To operate the Service: run your agents, show run history, enforce your settings.</li>
        <li>To secure the Service and debug failures.</li>
        <li>We do <strong>not</strong> sell your data or use your content to train AI models.</li>
      </ul>

      <h2>4. Sharing</h2>
      <p>
        Data is shared only with the third-party services you explicitly connect (your AI
        provider, your email/messaging/SMS providers) and only as needed to execute your
        agents&apos; instructions. We do not share your data with advertisers or data brokers.
      </p>

      <h2>5. Retention and deletion</h2>
      <ul>
        <li>Run history is kept so you can audit your agents. Deleting an agent deletes its runs.</li>
        <li>Removing a connector deletes its stored credentials.</li>
        <li>
          Deleting your account removes your agents, connectors, credentials, and run history.
        </li>
      </ul>

      <h2>6. Security</h2>
      <p>
        Credentials are encrypted at rest and transmitted over TLS. No system is perfectly
        secure, and you use the Service at your own risk  -  see the Terms of Service for the full
        disclaimer of warranties.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update this policy from time to time. Material changes will be reflected by the
        &quot;Last updated&quot; date above. Continued use after changes constitutes acceptance.
      </p>

      <h2 id="data-deletion">8. Data deletion requests</h2>
      <p>
        You may request deletion of your personal data at any time. There are two ways to do this:
      </p>
      <ul>
        <li>
          <strong>Self-service.</strong> Deleting your account from the Settings page removes all
          your agents, connectors, credentials, run history, and stored keys immediately and
          permanently.
        </li>
        <li>
          <strong>Email request.</strong> Send an email to{" "}
          <a href="mailto:privacy@setod.com">privacy@setod.com</a> with the subject line
          &quot;Data Deletion Request&quot; and include the email address associated with your
          account. We will process your request within 30 days and confirm once complete.
        </li>
      </ul>
      <p>
        If your data was accessed via a third-party integration (such as Instagram or WhatsApp),
        deletion from this Service does not affect data held by those third parties. Please
        contact them separately to exercise your rights under their platforms.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href="mailto:privacy@setod.com">privacy@setod.com</a>.
      </p>
    </>
  )
}
