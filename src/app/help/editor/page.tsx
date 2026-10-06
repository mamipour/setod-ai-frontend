import Link from "next/link"
import { Callout, C, DocHeader, List, NextUp, P, Section, Steps } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help - Coding Agents" }

export default function EditorHelp() {
  return (
    <>
      <DocHeader
        title="Coding Agents"
        lede="An MCP connector lets an agent call another server. This page is the other direction: Claude or Cursor calls Setod, and builds or diagnoses agents in your workspace."
      />

      <Section title="What it is">
        <P>
          You create a personal access token in{" "}
          <Link href="/settings" className="underline underline-offset-4 hover:text-foreground">
            Settings → Developer
          </Link>
          . The editor sends that token with every tool call. Setod answers the call and
          does not run a model of its own — the editor&apos;s model does the thinking.
        </P>
        <P>
          Install the Setod skill as well. It tells the editor the order to follow. Live
          details (what each connector tool returns, plan limits, failure patterns) come
          from the server, so an installed skill does not go stale.
        </P>
      </Section>

      <Section title="Connect Claude Code">
        <P>Copy the Claude Code command from Settings → Developer. It looks like this:</P>
        <P>
          <C>claude mcp add --transport http setod &lt;url&gt; --header &quot;Authorization: Bearer &lt;token&gt;&quot;</C>
        </P>
        <Steps>
          <li>Create a token and copy the command. The token is shown only once.</li>
          <li>Run the command in a terminal, then open Claude Code in the project.</li>
          <li>
            Install the skill: <C>/plugin marketplace add mamipour/setod-skills</C>, then{" "}
            <C>/plugin install setod-fde@setod</C>.
          </li>
        </Steps>
      </Section>

      <Section title="Connect Cursor">
        <P>
          Settings → Developer has a <C>~/.cursor/mcp.json</C> block. Paste it into that
          file (or into the project&apos;s <C>.cursor/mcp.json</C>), with your token in the
          Authorization header. Restart Cursor so it picks up the server.
        </P>
        <P>
          Install the skill with <C>npx skills add mamipour/setod-skills</C>. Later,{" "}
          <C>npx skills update</C> pulls a newer skill when the server says yours is behind.
        </P>
      </Section>

      <Section title="Install the skill">
        <List>
          <li>
            Cursor and most other clients: <C>npx skills add mamipour/setod-skills</C>
          </li>
          <li>
            Claude Code: <C>/plugin marketplace add mamipour/setod-skills</C>, then{" "}
            <C>/plugin install setod-fde@setod</C>
          </li>
        </List>
      </Section>

      <Section title="What it can and cannot do">
        <P>
          It can list and edit agents, attach connectors you already connected, write
          prompt skills and code skills, dry-run an agent, and publish after a passing
          dry run. It can read runs and explain why one failed.
        </P>
        <List>
          <li>It cannot create connectors, invite members, change billing, or delete agents.</li>
          <li>It cannot read or write code-skill secret values.</li>
          <li>A live run (one that really sends mail or messages) only happens if you ask for it.</li>
          <li>Changing tools on an already published agent takes effect on the next run. The editor must ask you first.</li>
        </List>
      </Section>

      <Section title="One token is one workspace">
        <P>
          A token belongs to you and to one workspace. If you work in a second workspace,
          add a second server entry with its own token. The editor cannot switch workspaces
          with the same token.
        </P>
        <Callout tone="info">
          A member can create a read token. A write token, which can change agents, is
          available to workspace owners.
        </Callout>
      </Section>

      <Section title="Tokens and revoking">
        <P>
          Tokens expire after 30, 90, or 365 days, or never. You can hold ten active tokens
          per workspace. Revoke one from Settings → Developer; the editor&apos;s next call
          fails until you paste a new token. Signing out everywhere also invalidates them.
        </P>
        <P>
          The plaintext is shown once, in the browser tab that created it. Setod stores
          only a hash.
        </P>
      </Section>

      <NextUp page={nextPage("/help/editor")} />
    </>
  )
}
