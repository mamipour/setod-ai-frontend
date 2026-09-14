# Setod — Dashboard

Next.js dashboard for [Setod](https://setod.com): an AI agent platform for small-business back-office work. This is the UI. The API, worker, and database live in [`setod-ai-backend`](https://github.com/mamipour/setod-ai-backend).

Sign-in is Google OAuth through the API. The dashboard never holds model keys or account passwords itself — those stay encrypted on the backend.

## What you can do here

- **Connect accounts** once per workspace (Gmail + Calendar via App Password, Telegram bot or account, Twilio, OpenAI, Anthropic, MCP servers, optional Tavily for web search).
- **Build an agent** from a template (Emergency Email Triage, Telegram Group Lead Finder) or from scratch: instructions in plain English, tools from the accounts you attached, a schedule.
- **Talk to Copilot** while writing instructions. It can look up a URL or a past run, then give you a prompt to copy in. It cannot save or publish anything.
- **Test, then publish.** A test run is a real run — it uses the connected accounts and actually sends. Until you publish, the agent never runs on its own. Edits after that go to a draft.
- **Read every run** as a full transcript: what the model saw, which tools it called, what they returned.
- **Skills, notes, knowledge, approvals** — reusable rules, facts the agent should know, uploaded documents, and a pause before irreversible actions.

## Requirements

- Node.js 20+
- The [Platform API](https://github.com/mamipour/setod-ai-backend) running (and its worker, if you want scheduled agents to fire)

## Setup

```bash
npm install
cp .env.example .env.local
```

`.env.local` needs one value:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

No trailing slash. In production this is the public API origin (for example `https://api.setod.com`).

```bash
./run.sh
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

`npm run build` fetches Inter and Geist Mono from Google Fonts at compile time, so the machine that builds needs outbound access to `fonts.googleapis.com`.

## Stack

Next.js 16 (App Router), React 19, Tailwind 4. Pages under `src/app/(dashboard)/` talk to the API through `src/lib/api.ts`.

## Related

- API and worker: [setod-ai-backend](https://github.com/mamipour/setod-ai-backend)
- Product: [setod.com](https://setod.com)
