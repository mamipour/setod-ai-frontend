import { Callout, DocHeader, List, NextUp, P, Section, Steps, C, Table } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Tool approvals - Help" }

export default function ApprovalsHelp() {
  const next = nextPage("/help/approvals")
  return (
    <div className="space-y-10">
      <DocHeader
        title="Tool approvals"
        lede="Pause a run before the agent sends something and wait for your sign-off before it continues."
      />

      <Section title="What it is">
        <P>
          By default, every tool an agent is allowed to use runs automatically. Approval mode
          adds a human checkpoint: the agent pauses mid-run, shows you exactly what it is about
          to do, and only proceeds once you approve - or stops if you reject.
        </P>
        <P>
          This is useful for actions with real-world consequences - sending an email, firing an
          SMS, forwarding a message - where you want to stay in the loop without writing the
          messages yourself.
        </P>
      </Section>

      <Section title="Enabling approval for a tool">
        <P>
          Open the agent, go to the <strong>Agent</strong> tab, and find the connector section.
          Each tool is shown as a pill. Click a pill to cycle through three states:
        </P>
        <Table
          headers={["State", "Appearance", "Meaning"]}
          rows={[
            ["On", "Blue", "Tool runs automatically - no interruption."],
            ["Requires approval", "Amber + shield icon", "Agent pauses and waits for your decision before running this tool."],
            ["Off", "Strikethrough", "Tool is disabled entirely - the agent cannot call it."],
          ]}
        />
        <P>
          The same three-state pills are available in the create agent flow, so you can configure
          approval gates from the very beginning.
        </P>
      </Section>

      <Section title="What happens during a run">
        <Steps>
          <li>The agent runs normally - reading emails, reasoning, building a response.</li>
          <li>
            When it reaches an approval-gated tool, it pauses. The session status changes to
            <C>Waiting for approval</C> and the run stays open.
          </li>
          <li>
            The <strong>Approvals</strong> page (sidebar) gets a badge showing the number of
            pending requests.
          </li>
          <li>
            You review the card: it shows which agent wants to act, a plain-English summary
            of the action, and the full arguments the model passed.
          </li>
          <li>You approve or reject. Optionally add a note.</li>
          <li>
            If approved, the tool runs for real and the agent continues. If rejected, the agent
            receives your reason, summarises what it could not do, and stops cleanly.
          </li>
        </Steps>
      </Section>

      <Section title="The Approvals page">
        <P>
          Go to <strong>Approvals</strong> in the sidebar. Pending requests are shown at the
          top. Each card contains:
        </P>
        <List items={[
          "Which agent triggered it and when.",
          "A one-line summary of the action (e.g. \"Send email to alice@... - subject: Invoice\").",
          "A collapsible view of the raw tool arguments - useful for verifying recipient addresses or message content.",
          "A countdown showing how long until the request auto-expires.",
          "Approve and Reject buttons. Reject lets you type a reason.",
        ]} />
        <P>
          Resolved requests (approved, rejected, or expired) are accessible via
          <strong> Show resolved history</strong> at the bottom of the page.
        </P>
      </Section>

      <Section title="Auto-expiry">
        <P>
          Approval requests expire after <strong>24 hours</strong> if you do not respond. The
          agent is automatically rejected with the message "No response within 24 hours" and the
          session closes. The items the agent read are released so the next scheduled run can
          re-evaluate them.
        </P>
        <Callout kind="warn">
          If the agent runs on a schedule, a pending approval blocks that specific run - it does
          not block the next scheduled tick. A new run will start at the next interval and
          re-read the same data (unless you approved the previous one first).
        </Callout>
      </Section>

      <Section title="How items avoid being re-processed">
        <P>
          When an agent reads an email (or Telegram message) and then pauses for approval,
          that item is immediately <em>reserved</em> in the idempotency ledger. Other runs skip
          it while the approval is pending - they will not send a duplicate notification asking
          you to approve the same thing twice.
        </P>
        <P>
          The reservation is resolved in one of three ways:
        </P>
        <List items={[
          "Approved and run succeeds - reservation is confirmed permanently. The item never appears again.",
          "Rejected - reservation is released. The item comes back on the next scheduled run so the agent can re-evaluate it (in case circumstances changed).",
          "Expired (24 h timeout) - same as rejected: reservation released, item returns next run.",
        ]} />
      </Section>

      <Section title="Dry runs and approval">
        <P>
          Test runs (the <strong>Run</strong> button in the agent builder) skip all approval
          gates. The point of a test run is to see the full agent behaviour uninterrupted;
          approval-gated tools are simulated just like any other tool.
        </P>
      </Section>

      <Section title="Limitations">
        <List items={[
          "Only one pending approval per session. If the agent wants to make two approval-gated calls in one turn, it will be paused on the first one. The second is handled after resumption.",
          "Approval cards poll every 15 seconds. There may be a short lag between approving and the agent resuming.",
          "The agent resumes on the next worker tick (default every 20 seconds) after you approve.",
          "There is no mobile push notification yet - you need to check the Approvals page manually.",
        ]} />
      </Section>

      {next && <NextUp href={next.href} title={next.title} />}
    </div>
  )
}
