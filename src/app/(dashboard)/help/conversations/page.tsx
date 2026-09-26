import { Callout, DocHeader, List, NextUp, P, Section, Steps, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Conversations - Help" }

export default function ConversationsHelp() {
  const next = nextPage("/help/conversations")
  return (
    <div className="space-y-10">
      <DocHeader
        title="Conversations"
        lede="Every inbound message from Telegram, WhatsApp, Instagram, and SMS is threaded into a conversation your agent can remember — and you can take over when needed."
      />

      <Section title="How it works">
        <P>
          When someone sends a message to one of your channel connectors (Telegram bot,
          WhatsApp, Instagram DM or comment, or Twilio SMS), Setod stores it in a
          <strong> conversation thread</strong> keyed to that person and channel. The agent
          receives the full recent history every time it runs, so it never loses context between
          messages.
        </P>
        <P>
          Multiple messages sent within <strong>10 seconds</strong> of each other are bundled
          into a single agent run so the agent sees the complete thought before replying. A
          hard cap of 30 seconds prevents unbounded delays.
        </P>
      </Section>

      <Section title="Supported channels">
        <List>
          <li><strong>Telegram Bot</strong> — text, voice notes, photos, documents, location, stickers; private chats and groups</li>
          <li><strong>Telegram Account</strong> — text from your chats and groups, read by the agent on its schedule</li>
          <li><strong>WhatsApp</strong> — text, audio, images, video, documents, location, stickers, contacts</li>
          <li><strong>Instagram DM</strong> — text, image attachments</li>
          <li><strong>Instagram Comment</strong> — text; each commenter × post is a separate thread</li>
          <li><strong>Twilio SMS/MMS</strong> — text + MMS media (images, documents)</li>
        </List>
      </Section>

      <Section title="Group chats">
        <P>
          A Telegram group is one conversation. Every message in it records who wrote it, and a
          reply keeps a short quote of the message it answers — so the agent reads{" "}
          <C>Ali: ↳ re Reza: &quot;Anyone know an accountant?&quot; — I can give you a number</C>{" "}
          rather than a bare &quot;I can give you a number&quot;. Your own messages are labelled{" "}
          <em>You</em>. Group summaries keep names and recurring requests instead of a single
          customer&apos;s story.
        </P>
      </Section>

      <Section title="Media messages">
        <P>
          Audio, images, and documents are never dropped: the file is stored and shows up in the
          thread. Whether it is also <em>processed</em> is decided per agent, under{" "}
          <strong>Settings → Inbound media processing</strong>. Processing is off by default for
          audio, images and video — a group that shares fifty memes a day should not cost you
          fifty vision calls. Documents are on by default because extracting their text costs
          nothing.
        </P>
        <List>
          <li><strong>Voice / Audio</strong> → transcribed via Whisper using your OpenAI key (~$0.006 per minute)</li>
          <li><strong>Image</strong> → one-paragraph description via GPT-4o-mini</li>
          <li><strong>Document</strong> (.pdf, .txt, .md, .csv) → text extracted, first 4 000 chars</li>
          <li><strong>Location</strong> → coordinates + Google Maps link</li>
          <li><strong>Video / Sticker / Contact</strong> → marker only</li>
        </List>
        <Callout>
          When processing is off the agent sees a marker such as{" "}
          <C>[voice note — audio processing disabled for this agent]</C>. When it is on but no{" "}
          <strong>OpenAI connector</strong> is attached to the workspace, the marker says
          transcription is unavailable and the agent is instructed to ask the sender to type
          their message instead. If several agents listen to the same connector, media is
          processed as soon as any one of them has it turned on.
        </Callout>
      </Section>

      <Section title="Conversation history">
        <P>
          Each agent run prepends the last 30 turns of the conversation to the opening message.
          Older turns are compressed into a rolling summary automatically after every successful
          run, so context is preserved without consuming the entire prompt window.
        </P>
      </Section>

      <Section title="Conversations inbox">
        <P>
          Go to <strong>Conversations</strong> in the sidebar to see all active threads across
          all your channel connectors. Click any thread to read the full history.
        </P>
        <P>
          Threads are colour-coded by status:
        </P>
        <List>
          <li><strong>Open</strong> — agent is handling replies automatically</li>
          <li><strong>Human</strong> — you have taken over; the agent will not reply until you resume it</li>
          <li><strong>Closed</strong> — thread archived</li>
        </List>
      </Section>

      <Section title="Human takeover">
        <Steps>
          <li>Open the conversation thread in the Conversations inbox.</li>
          <li>Click <strong>Take over</strong> in the top-right corner. The status changes to <strong>Human</strong>.</li>
          <li>A text box appears at the bottom. Type your reply and press Send (or Ctrl/⌘ + Enter). The message is recorded in the thread for context.</li>
          <li>When you are done, click <strong>Resume agent</strong> to hand back to the AI.</li>
        </Steps>
        <Callout>
          Note: the reply box records the message in Setod for context tracking, but does
          <em> not</em> send it through the channel automatically. You need to reply in the
          channel app (Telegram, WhatsApp, etc.) directly. Full send-via-API support is planned.
        </Callout>
      </Section>

      <Section title="Data retention">
        <P>
          Conversation messages and stored media files are automatically deleted when they exceed
          your organisation's <strong>Data retention</strong> setting (Settings → Data retention).
          Conversations with no inbound activity since the cutoff are also removed.
        </P>
      </Section>

      {next && <NextUp href={next.href} title={next.title} />}
    </div>
  )
}
