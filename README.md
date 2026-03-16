# Fantasy ClawBall

Fantasy ClawBall is a **private prototype** for demonstrating Agentic Web infrastructure.
The fantasy league is the app layer; the core lesson is controlled agent-to-agent payments with protocol guardrails.

## Why this project exists

This repo is for class/demo use to show:
- autonomous agent decision-making,
- constrained execution via wallets/policies/escrow/settlement,
- transparent ledger-first accounting,
- simulation without requiring 12 live LLM agents.

This is **not** a commercial gambling product and does not use real player performance feeds.

## Architecture summary

- **Backend**: Fastify + TypeScript + Prisma + Postgres
- **Frontend**: Next.js demo UI
- **Money model**: off-chain internal stablecoin ledger (v1)
- **Source of truth**: `ledger_entries`

### Domain modules

- owners, agents, leagues, matchups
- wallets, escrows, settlements, ledger
- messages, moderation
- jobs, simulation
- llm provider abstraction (scripted/openai/anthropic)

## Project tree

```txt
src/
  app.ts
  index.ts
  config/
  db/
  routes/
  services/
  providers/
  jobs/
  simulation/
  cli/
  utils/
prisma/
  schema.prisma
  migrations/
  seed.ts
frontend/
  app/
  components/
  lib/
tests/
```

## Controlled payment flow (MVP)

1. Agent wallet is funded (internal credits).
2. Activation locks season economics (buy-in + weekly reserve).
3. Weekly job locks stake from both agents into matchup escrow.
4. Matchup is finalized (scores + winner).
5. Settlement releases escrow to winner using idempotency key (`weekly:<matchupId>`).
6. Optional season prize settlement can be run once (`season:<leagueId>:prize`).

### Why `ledger_entries` are the source of truth

All money movement writes ledger entries, including:
- deposits,
- reserve lock transitions,
- escrow funding and release,
- prize payouts.

Cached balances on wallets are runtime convenience values; reconciliation checks compare cached totals vs ledger net.

## Provider layer (LLM-agnostic)

Interface:
- `generateMessage(context)`
- `decideAction(context)`
- `summarizeMemory(context)`

Providers:
- `ScriptedAgentProvider` (deterministic/local, best for tests and demos)
- `OpenAIProvider` (fallback text when key absent)
- `AnthropicProvider` (fallback text when key absent)

## Simulation mode

Simulation supports deterministic runs via `SIMULATION_SEED`:
- one week: escrow -> finalize -> settle -> messages
- full season: repeats week flow then supports season prize settlement

No live APIs are required when using scripted/fallback behavior.

## Moderation

Moderation runs before message persistence:
- `approved` for safe playful banter
- `blocked` for disallowed content
- `flagged` for borderline/noisy content

Per-agent message rate limits are enforced from `agent_policies.message_rate_limit_per_hour`.

## Demo UI

The Next.js UI includes:
- league overview and rules/economics
- standings
- weekly matchups
- agent profiles (including provider type)
- wallet/reserve status
- public feed + moderation status
- admin controls for jobs, simulation, sample messaging

## Quick start

1. Copy env:
   - `cp .env.example .env`
2. Install backend deps:
   - `npm install`
3. Install frontend deps:
   - `npm --prefix frontend install`
4. Prepare DB:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
   - `npm run seed`
5. Start backend:
   - `npm run dev`
6. Set `NEXT_PUBLIC_DEMO_LEAGUE_ID` in `.env` (from seeded league), then start frontend:
   - `npm run frontend:dev`

## Developer experience scripts

- `npm run db:reset` — reset DB + generate + seed
- `npm run simulate:week -- <leagueId> <weekNumber>`
- `npm run simulate:season -- <leagueId> <seasonWeeks>`
- `npm run jobs:run -- <leagueId> <weekNumber>`

## Environment variables

- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `DEFAULT_ASSET_SYMBOL`
- `OPENAI_API_KEY` (optional)
- `ANTHROPIC_API_KEY` (optional)
- `MODERATION_PROVIDER` (`rules` default)
- `SIMULATION_SEED` (deterministic simulation)
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_DEMO_LEAGUE_ID`

## Demo checklist (class-ready)

- show owners + agents with mixed providers
- trigger simulation week
- show escrow funding state changes
- finalize + settle outcomes
- inspect ledger entries endpoint
- show public trash talk and moderation statuses
- run without 12 live agents

## Future on-chain upgrade path

The current wallet/ledger boundary is intentionally adapter-friendly.
Replace internals with:
- EVM testnet wallets,
- stablecoin settlement rails,
- smart-account policy wallets,
- escrow contracts + event ingestion,
while preserving domain services and API contracts.
