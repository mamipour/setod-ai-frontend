import { Callout, DocHeader, List, NextUp, P, Section, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  How it avoids repeating itself" }

export default function MemoryHelp() {
  return (
    <>
      <DocHeader
        title="How it avoids repeating itself"
        lede="An agent checking your inbox every 30 minutes sees the same unread mail every time. Here is why it does not reply to it forty-eight times a day."
      />

      <Section title="The handled list">
        <P>
          Each agent keeps a private list of the items it has already dealt with. When it
          reads unread mail or unread Telegram chats, anything on that list is filtered out
          before the agent ever sees it  -  so the model does not have to remember anything,
          and cannot get it wrong.
        </P>
        <P>
          The list belongs to one agent and one account. Two agents watching the same inbox
          each keep their own, so both will see every message. That is intentional, but it
          does mean two agents told to reply will both reply.
        </P>
      </Section>

      <Section title="When something gets added to the list">
        <P>
          It depends on whether the action can be taken back:
        </P>
        <List>
          <li>
            <strong>Irreversible actions are recorded the moment they happen.</strong> Once a
            reply is sent, that is written down immediately. If the run crashes three steps
            later, the reply is still never sent twice.
          </li>
          <li>
            <strong>Merely reading something is recorded only if the whole run
            succeeds.</strong> If a run fails halfway through, the items it had read but not
            yet acted on go back in the pile and appear again next time.
          </li>
        </List>
        <P>
          The second rule is the safer trade. A failed run means work probably did not get
          done, and it is better to look at something twice than to silently drop a customer
          email the agent never got round to.
        </P>
      </Section>

      <Callout tone="warn" title="Searching bypasses all of this">
        <p>
          <C>search_emails</C> returns everything that matches your query, including messages
          the agent already handled. Only the &ldquo;read unread&rdquo; tools filter. If your
          instructions tell the agent to search and then reply, it can reply to the same
          message on every single run  -  so use search to look things up, and the unread tools
          to decide what to act on.
        </p>
      </Callout>

      <Section title="Test runs do not mark anything as read">
        <P>
          Because a test run is a real run, anything it actually sends is recorded. But
          simply reading during a test does not add to the handled list, so testing does not
          hide messages from the next real run.
        </P>
      </Section>

      <Section title="Deleting an agent wipes its list">
        <P>
          Rebuilding an agent from scratch gives it an empty handled list, so it will treat
          everything currently unread as new and act on all of it. If that inbox has two
          hundred unread messages, be careful what you publish next. Editing an agent, even
          heavily, keeps the list intact  -  only deleting clears it.
        </P>
      </Section>

      <Section title="Remembering past runs is a different thing">
        <P>
          The handled list is always on and is about specific messages. The{" "}
          <strong>Remember past runs</strong> setting is optional and about conclusions: it
          starts each run with a short note of what the agent decided on its last five runs.
          Useful when you want continuity of judgement, unnecessary for most agents, and it
          adds a little to the cost of every run.
        </P>
      </Section>

      <NextUp {...nextPage("/help/memory")!} />
    </>
  )
}
