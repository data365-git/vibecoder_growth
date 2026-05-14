# Vibecoder Growth & Performance System

Internal data365 tool for tracking the vibecoder team's daily discipline, weekly growth, and monthly performance scoring → bonus calculation.

See plan: `C:\Users\User\.claude\plans\longer-refactored-corbato.md`

## Stack

- **server/**: TypeScript + Hono + Drizzle ORM + grammy (Telegram bot) + node-cron + @notionhq/client
- **web/**: React 18 + Vite + Tailwind + shadcn/ui (PM admin UI)
- **db**: PostgreSQL (source of truth)
- **Notion**: one-way mirror of growth log entries (6 databases)

## Setup

```bash
pnpm install
cp .env.example .env          # fill values
pnpm db:generate              # generate Drizzle migration
pnpm db:migrate               # apply migration
pnpm notion:setup             # create 6 Notion databases (once)
pnpm seed                     # seed admin + sample vibecoders for dev
pnpm dev:server               # start API + bot (polling)
pnpm dev:web                  # start admin UI
```

## Deploy (Railway)

```bash
railway init
railway link
railway variables set GROWTH_BOT_TOKEN=... NOTION_TOKEN=... NOTION_PARENT_PAGE_ID=...
railway up
railway logs
```

Set `BOT_MODE=webhook` and `WEBHOOK_URL=https://<service>.up.railway.app/bot` for production.

## Phase 2 (deferred)

Merge into `data365-platform-01616` ERP: shared auth (replace JWT with ERP SSO), link `vibecoders.user_id` to ERP `users`, add Growth sidebar entry to ERP web app.
