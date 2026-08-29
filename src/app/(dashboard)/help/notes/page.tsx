import { Callout, C, DocHeader, List, NextUp, P, Section } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help — Workspace notes" }

export default function NotesHelp() {
  return (
    <>
      <DocHeader
        title="Workspace notes"
        lede="Short reminders the owner writes once and every agent reads on every run — without republishing."
      />

      <Section title="What notes are for">
        <P>
          Notes are the fastest way to change what your agents know right now. While
          instructions are per-agent and only take effect after you republish, a note
          lands in every run the moment you save it — no republish required.
        </P>
        <P>
          Good candidates: temporary closures, staffing changes, anything that expires.
          Bad candidates: rules that should always apply — those belong in the agent&rsquo;s
          instructions so they survive a note cleanup.
        </P>
      </Section>

      <Section title="Notes vs instructions vs Knowledge">
        <List>
          <li>
            <strong>Instructions</strong> — permanent rules for one agent. Require a
            republish to change. The agent reads them on every run regardless of content.
          </li>
          <li>
            <strong>Workspace notes</strong> — short, org-wide, owner-authored. Take effect
            immediately on all matching agents. Best for temporary or shared context.
          </li>
          <li>
            <strong>Knowledge files</strong> — documents the agent searches when it needs
            a specific fact. The agent retrieves passages on demand; it does not read the
            whole document each run.
          </li>
        </List>
      </Section>

      <Section title="Facts and tasks">
        <P>
          When you add a note, you choose its type:
        </P>
        <List>
          <li>
            <strong>Fact</strong> (default) — the note stays live until it expires or you
            delete it. Example: &ldquo;Closed Aug 4 for the long weekend.&rdquo; Agents
            read it but cannot change it.
          </li>
          <li>
            <strong>Task</strong> (tick &ldquo;Agents can mark this done&rdquo;) — the note
            disappears from agent prompts as soon as one agent claims it via{" "}
            <C>mark_note_done</C>. Example: &ldquo;Kevin is waiting for a window to book —
            call when a slot opens.&rdquo; Two agents racing to handle the same task will
            only one succeed in claiming it; the other gets &ldquo;already handled&rdquo;
            and moves on.
          </li>
        </List>
      </Section>

      <Section title="Scope and expiry">
        <P>
          By default a note is visible to all agents in the workspace. You can narrow it
          to specific agents when you create or edit it.
        </P>
        <P>
          Notes can expire automatically: end of today, in one week, or a custom date.
          Expired notes move to a separate section in the Notes page — they are not
          silently deleted, so you can renew or review them. A fact like &ldquo;short-staffed
          this week&rdquo; should expire; a policy like &ldquo;never quote over the phone&rdquo;
          belongs in instructions.
        </P>
      </Section>

      <Callout tone="info" title="Changes take effect without republishing">
        <p>
          Unlike instructions, notes bypass the publish snapshot. The next run after you
          save a note will see it — no republish needed. This also means deleting a note
          removes it from the next run immediately.
        </p>
      </Callout>

      <Section title="What agents can and cannot do">
        <P>
          Agents read notes; they never author them. The only write action an agent can
          take is resolving a task note with <C>mark_note_done</C> — and only when the
          owner has explicitly enabled that for that note. The agent&rsquo;s resolution
          line is shown to the owner in the Done section but is never re-injected into any
          future prompt.
        </P>
      </Section>

      <NextUp {...nextPage("/help/notes")!} />
    </>
  )
}
