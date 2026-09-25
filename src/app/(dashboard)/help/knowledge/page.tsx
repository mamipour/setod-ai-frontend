import { Callout, DocHeader, List, NextUp, P, Section, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  Knowledge files" }

export default function KnowledgeHelp() {
  return (
    <>
      <DocHeader
        title="Knowledge files"
        lede="Give an agent documents to refer to - a price list, a returns policy, an FAQ - instead of pasting everything into its instructions."
      />

      <Section title="How it works">
        <P>
          Each agent has a <strong>Knowledge</strong> tab. Upload PDF, plain text, Markdown,
          CSV or Excel files there (up to 10 MB each) and they are split into passages and indexed
          in the background - a small file is ready in under a minute. From then on the
          agent has a <C>search_knowledge</C> tool: when a run needs a fact that might be in
          those files, it searches them and reads the best-matching passages.
        </P>
        <P>
          The agent retrieves passages, not whole documents. A question about refunds pulls
          the refund section of your policy, not all forty pages - which keeps runs cheap
          and answers focused.
        </P>
      </Section>

      <Section title="What it needs">
        <List>
          <li>
            <strong>An OpenAI connector.</strong> Indexing and searching use OpenAI&rsquo;s
            embedding model on your key. The amounts are tiny - indexing a large document
            costs a fraction of a cent - but without the connector, uploads are refused.
            This applies even if the agent itself thinks with Claude.
          </li>
          <li>
            <strong>Text the file actually contains.</strong> Scanned PDFs are photographs
            of pages; there is no text to extract, and the upload is rejected with a message
            saying so.
          </li>
        </List>
      </Section>

      <Section title="Tables you can query">
        <P>
          A CSV or Excel file is also turned into a table the agent can query with SQL,
          through a <C>query_data</C> tool. This is the right shape for anything with rows:
          a list of tenders, a product catalogue, last month&rsquo;s orders. Instead of
          reading five thousand rows and trying to filter them in its head, the agent asks
          for &ldquo;rows where the deadline is in the next two weeks and the category is
          IT&rdquo; and gets exactly those back. Counting, sorting, joining two files and
          totals all work the same way.
        </P>
        <P>
          The agent already knows each table&rsquo;s columns and types - they are shown to
          it on every run, along with a sample row - so you never write SQL yourself. Tell
          it <em>what</em> to find in plain language. The Knowledge tab shows each file&rsquo;s
          table name and how many rows and columns it has.
        </P>
        <List>
          <li>
            <strong>Excel:</strong> every sheet becomes its own table. A title row or blank
            lines above the real header are skipped automatically.
          </li>
          <li>
            <strong>Column names</strong> are tidied to <C>snake_case</C> (&ldquo;Ref
            No&rdquo; becomes <C>ref_no</C>); the agent is told the original name too.
          </li>
          <li>
            <strong>Mixed formats</strong> in a column (two different date styles, say) make
            that column plain text rather than failing the upload; the agent can still
            convert it when it queries.
          </li>
          <li>
            <strong>Limits:</strong> a query runs for at most 20 seconds and returns at most
            200 rows - the agent is told to aggregate or narrow the query when it hits either.
            Queries can only read the tables; nothing on the server is reachable from them.
          </li>
        </List>
      </Section>

      <Section title="What to put in - and what not to">
        <P>
          Knowledge suits reference material: things the agent should look up when relevant.
          Rules of behaviour belong in the instructions, which the agent reads on every run
          without fail. A passage in a knowledge file is only seen when the agent decides to
          search for it - so &ldquo;never promise a delivery date&rdquo; goes in the
          instructions, and the shipping rate table goes in Knowledge.
        </P>
      </Section>

      <Callout tone="warn" title="Files are shared with the model provider during search">
        <p>
          Passages retrieved from your documents are sent to the AI model as part of the
          run, the same as email content the agent reads. Do not upload documents you would
          not be willing to show the model provider.
        </p>
      </Callout>

      <Section title="Keeping it current">
        <P>
          There is no re-sync: a knowledge file is a snapshot from the moment you uploaded
          it. When the price list changes, delete the old file and upload the new one - the
          old passages disappear immediately, and the new ones are searchable as soon as the
          file shows <strong>Ready</strong>.
        </P>
      </Section>

      <NextUp {...nextPage("/help/knowledge")!} />
    </>
  )
}
