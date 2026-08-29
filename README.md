# Platform UI

Next.js dashboard for the agent platform. Talks to the Platform API.

## Requirements

- Node.js 20+
- The Platform API running (see that repo)

## Setup

```bash
npm install
cp .env.example .env.local
```

`.env.local` needs `NEXT_PUBLIC_API_URL` — `http://localhost:8000` for local development.

```bash
./run.sh
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign-in is Google OAuth through the API.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

The production build fetches Inter and Geist Mono from Google Fonts at compile time, so the machine that runs `npm run build` needs outbound access to `fonts.googleapis.com`.
