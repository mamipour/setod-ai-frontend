import { Callout, DocHeader, List, NextUp, P, Section, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  Writing instructions" }

export default function InstructionsHelp() {
  return (
    <>
      <DocHeader
        title="Writing instructions"
        lede="Instructions are the whole product. A good agent and a useless one usually differ by a paragraph of text, not by settings."
      />

      <Section title="The agent does nothing unless told">
        <P>
          Before your instructions, every agent is given a standing rule: do only what the
          instructions describe, never invent tasks, never reply to anything unless told to,
          and when in doubt do nothing. This is deliberate  -  an agent that improvises with
          your inbox is worse than one that does too little.
        </P>
        <P>
          The practical consequence is that vague instructions produce an agent that reports
          back and stops. If your agent seems to do nothing, the instructions are almost
          always the reason.
        </P>
      </Section>

      <Section title="What a good instruction block contains">
        <List>
          <li>
            <strong>The job, in one line.</strong> &ldquo;You triage email.&rdquo; Start
            there so everything after it has context.
          </li>
          <li>
            <strong>When to act and when not to.</strong> Define your terms. &ldquo;Urgent
            means a customer complaint, a failed payment, or a direct question from a
            client&rdquo; is usable; &ldquo;handle important emails&rdquo; is not.
          </li>
          <li>
            <strong>Exactly which tool to use for what.</strong> Name the action:
            &ldquo;send me a Telegram message&rdquo;, &ldquo;reply to the sender&rdquo;,
            &ldquo;archive it&rdquo;.
          </li>
          <li>
            <strong>What to do when nothing matches.</strong> Say &ldquo;if nothing is
            urgent, do nothing and say so&rdquo;. Without this, some models will try to be
            helpful in ways you did not ask for.
          </li>
          <li>
            <strong>Limits.</strong> &ldquo;Never send more than three messages in one
            run&rdquo;, &ldquo;never reply to newsletters&rdquo;, &ldquo;never promise a
            refund&rdquo;.
          </li>
        </List>
      </Section>

      <Callout tone="tip" title="Write the negative rules too">
        <p>
          Most unpleasant surprises come from something the instructions never forbade.
          Spend a line or two on what the agent must never do  -  it costs nothing and it is
          the cheapest safety mechanism available to you.
        </p>
      </Callout>

      <Section title="Referring to tools">
        <P>
          You do not have to use exact tool names, but it helps to be concrete about the
          action and the account. If an agent has two Gmail accounts attached, its tools are
          suffixed to tell them apart  -  <C>send_email_sales</C> and <C>send_email_support</C>{" "}
          rather than two identical <C>send_email</C> tools. In that situation, say which
          account you mean.
        </P>
      </Section>

      <Section title="Choosing a model">
        <P>
          A cheaper, faster model is usually fine for routing, summarising and pattern
          matching. Step up to a stronger model when the agent has to exercise judgement over
          ambiguous text, or when it keeps making the same mistake no matter how you rewrite
          the instructions. Changing the model is one dropdown and does not affect anything
          else.
        </P>
      </Section>

      <Section title="Iterating">
        <P>
          Write, test, read the transcript, adjust. The transcript shows every tool the agent
          called and everything it got back, so when the behaviour is wrong you can usually
          see the precise sentence that misled it. That loop is faster than trying to write
          perfect instructions on the first attempt.
        </P>
      </Section>

      <NextUp {...nextPage("/help/instructions")!} />
    </>
  )
}
