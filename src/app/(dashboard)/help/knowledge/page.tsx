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
          Each agent has a <strong>Knowledge</strong> tab. Upload PDF, plain text, Markdown
          or CSV files there (up to 10 MB each) and they are split into passages and indexed
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
