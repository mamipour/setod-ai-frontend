import { Callout, DocHeader, List, NextUp, P, Section, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help - MCP servers" }

export default function McpHelp() {
  return (
    <>
      <DocHeader
        title="MCP servers"
        lede="Attach remote HTTPS tool servers so an agent can call GitHub, Linear, Notion, Slack, or a server you run — without installing anything on our workers."
      />

      <Section title="What this is">
        <P>
          MCP (Model Context Protocol) is a standard for exposing tools over HTTP. setod
          acts as the <strong>client</strong>: you connect a remote server, we freeze its
          tool list, and those tools show up as pills on the agent like Gmail or Telegram.
        </P>
        <P>
          We only speak <strong>Streamable HTTP</strong>. There is no stdio, no{" "}
          <C>npx</C>, and no process launched on our side. If a guide tells you to run a
          local MCP server on your laptop, that will not work here unless you expose it as
          a public HTTPS endpoint you control.
        </P>
      </Section>

      <Section title="Catalog versus custom URL">
        <List>
          <li>
            <strong>Catalog</strong> — GitHub, Linear, Notion, Slack, Atlassian, and Zapier.
            We fill in the official URL (Zapier asks you to paste the URL it generates).
          </li>
          <li>
            <strong>Custom MCP server</strong> — any HTTPS URL you run. We probe it first.
          </li>
        </List>
        <P>
          Both create the same connector type. Catalog cards are presets, not a different
          runtime.
        </P>
      </Section>

      <Section title="How authentication is chosen">
        <P>We do not ask you to pick OAuth versus a token up front. On connect we:</P>
        <List>
          <li>Reject anything that is not HTTPS, and block private or reserved addresses</li>
          <li>Try <C>tools/list</C> with no credential</li>
          <li>If the server returns 401 and advertises OAuth metadata, we start Sign in</li>
          <li>Otherwise we ask for a bearer token (a GitHub PAT, a Zapier key, and so on)</li>
        </List>
        <Callout>
          Official Notion, Slack, and Atlassian remotes typically require OAuth. GitHub and
          Zapier usually accept a pasted token. Linear supports both.
        </Callout>
      </Section>

      <Section title="Slack needs its own OAuth app">
        <P>
          Notion, Linear, and Atlassian register a client for us automatically. Slack does
          not. You create a Slack app, add our callback as a redirect URI, then paste the
          client ID and secret when you click Connect.
        </P>
        <List>
          <li>
            Redirect URI is <C>PUBLIC_BASE_URL</C> plus{" "}
            <C>/connectors/oauth/mcp/callback</C>. Locally that is{" "}
            <C>http://localhost:8000/connectors/oauth/mcp/callback</C> when the
            env var is blank.
          </li>
          <li>
            Slack: create an <strong>internal</strong> app at{" "}
            <a href="https://api.slack.com/apps" className="underline">
              api.slack.com/apps
            </a>
            . Unlisted apps cannot use Slack MCP. Turn on{" "}
            <strong>Agents &amp; AI Apps → Model Context Protocol</strong>. Under{" "}
            <strong>OAuth &amp; Permissions</strong>, add the redirect URI and the{" "}
            <strong>User Token Scopes</strong> Slack MCP lists (chat, channels, search, files,
            users, canvases).
          </li>
          <li>
            Optional: set <C>SLACK_MCP_CLIENT_ID</C> and <C>SLACK_MCP_CLIENT_SECRET</C> on
            the API so Connect skips the paste step for everyone in this deployment.
          </li>
        </List>
      </Section>

      <Section title="Frozen tools">
        <P>
          When the connector is saved, we store the tool names, descriptions, and schemas
          the server advertised. The agent uses that snapshot on every run. If the vendor
          adds or changes tools, use <strong>Re-sync</strong> on the connector card. We
          never refresh schemas silently — that is how a poisoned description would reach a
          scheduled agent.
        </P>
      </Section>

      <Section title="Approvals">
        <P>
          Write-like MCP tools (names containing create, update, delete, send, and similar)
          start as <strong>requires approval</strong> when you first attach the connector
          to an agent. Cycle the pill like any other tool: green (on), amber (approval),
          struck through (off).
        </P>
      </Section>

      <Section title="What we will not do">
        <List>
          <li>Run community MCP servers as subprocesses on the worker</li>
          <li>Expose setod itself as an MCP server (so Claude Desktop can call us)</li>
          <li>Load MCP resources, prompts, or sampling in this version</li>
          <li>Wake an agent from an MCP event — schedules and manual runs only</li>
        </List>
      </Section>

      <NextUp page={nextPage("/help/mcp")} />
    </>
  )
}
