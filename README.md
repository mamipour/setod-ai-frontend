<p align="center">
  <img src="public/logo.svg" alt="Setod" width="56" />
</p>

# Setod — Dashboard

Next.js dashboard for [Setod](https://setod.com): an AI agent platform for small and medium size business back-office work. You connect accounts, write instructions, and put an agent on a schedule.

Actively maintained. The service people use is [setod.com](https://setod.com). This repository is the MIT source for the UI. The API, worker, and database are [`setod-ai-backend`](https://github.com/mamipour/setod-ai-backend).

A star helps other people find the repo.

## What you do here

Sign in with Google, through the API. This app does not store model keys or account passwords. Those stay encrypted on the backend.

- Connect accounts once per workspace: Gmail and Google Calendar (App Password), Telegram bot or account, Twilio SMS, WhatsApp Business, Instagram, Slack, HubSpot, Pipedrive, Airtable, Shopify, Calendly, inbound webhooks, OpenAI, Anthropic, MCP servers (GitHub, Linear, Notion, Slack, Atlassian, Zapier), and optional Tavily for web search.
- Start from a template, including Emergency Email Triage and Telegram Group Lead Finder, or from a blank agent.
- Ask Copilot while you write. It can look up a URL or a past run, then hand you a prompt to copy in. It cannot save or publish.
- Test, then publish. A test run uses the connected accounts and really sends. Until you publish, the agent does not run on its own. Later edits stay in a draft.
- Read each run as a transcript: what the model saw, which tools it called, and what they returned.
- Add skills, notes, uploaded documents, and a pause before irreversible actions.

## Why this UI exists

The decision is the instruction and the accounts, not a graph of steps. Publish freezes the instructions. The accounts stay live. A send can wait until a person approves it.

Use [setod.com](https://setod.com) if you want that without running servers. Clone this repo if you want to change the dashboard.

## Requirements

- Node.js 20 or newer (Next.js 16)
- The [API](https://github.com/mamipour/setod-ai-backend) running. Scheduled agents also need its worker.

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
```

The install flag is the one the production build uses. `.env.local` needs:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

No trailing slash. In production this is the public API origin, for example `https://api.setod.com`.

```bash
./run.sh
```

`./run.sh` runs `npm run dev`. Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

`npm run build` loads Geist and Geist Mono from Google Fonts, so the build machine needs outbound access to `fonts.googleapis.com`.

## Stack

Next.js 16.3 (App Router), React 19, Tailwind 4. Pages under `src/app/(dashboard)/` call the API through `src/lib/api.ts`.

## License

[MIT](LICENSE)

## Related

- API and worker: [setod-ai-backend](https://github.com/mamipour/setod-ai-backend)
- Product: [setod.com](https://setod.com)
