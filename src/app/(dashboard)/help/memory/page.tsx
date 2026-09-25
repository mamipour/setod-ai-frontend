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

      <Section title="Two other kinds of memory">
        <P>
          The handled list is always on, is maintained for you, and is about specific
          messages. For everything else the agent has two memories of its own, and they
          are good at different things.
        </P>
        <List>
          <li>
            <strong>Exact state (the Memory tab).</strong> Values the agent stores on
            purpose and gets back verbatim next run: the last order id it confirmed, the
            reference numbers it already reported, how many reminders it has sent a client.
            It does this through <C>memory_get</C> and <C>memory_set</C> tools that are on by
            default (<em>Keep exact state</em> in Settings). Everything it stores appears on
            the agent&rsquo;s <strong>Memory</strong> tab, where you can read it, change it or
            delete it - reset the &ldquo;last processed id&rdquo; after a bad run, or seed a
            value before the first one. The agent sees your edit on its next run.
          </li>
          <li>
            <strong>Remember past runs (Settings).</strong> Optional, and fuzzier: the agent
            ends each run with a short note to its future self and reads the most relevant
            notes back next time. Right for continuity of judgement - &ldquo;I decided this
            supplier is not a fit&rdquo; - and for &ldquo;don&rsquo;t report the same thing
            twice&rdquo; when the things have no stable reference to compare. It adds a little
            to the cost of every run.
          </li>
        </List>
        <P>
          A rule of thumb: if you could write the value in a spreadsheet cell, it belongs in
          exact state. If it is a sentence, it belongs in past-run notes. You do not choose
          the mechanics - describe what to remember in plain English (&ldquo;keep the id of
          the last order you confirmed&rdquo;) and the agent picks the right one.
        </P>
      </Section>

      <Section title="Sharing state between agents">
        <P>
          A key that starts with <C>shared:</C> is visible to every agent in the workspace,
          so one agent can hand something to another: a finder agent records the tenders it
          has seen under <C>shared:tenders_seen</C>, and a summariser agent reads the same
          list. Shared keys show up on every agent&rsquo;s Memory tab with a{" "}
          <em>shared</em> badge. Deleting one affects all of them, which is why{" "}
          <em>Clear all</em> only removes the agent&rsquo;s private keys.
        </P>
      </Section>

      <Callout tone="info" title="Limits, and what happens when they are hit">
        <p>
          Keys are up to 128 characters, values up to 16 KB of JSON, and each agent holds at
          most 200 keys (the workspace&rsquo;s shared keys have their own 200). When the agent
          tries to go past a limit, the tool tells it in plain language and it adapts - stores
          a summary, or deletes something old. Test runs simulate writes: the transcript shows{" "}
          <C>[simulated]</C> and nothing is stored.
        </p>
      </Callout>

      <NextUp {...nextPage("/help/memory")!} />
    </>
  )
}
