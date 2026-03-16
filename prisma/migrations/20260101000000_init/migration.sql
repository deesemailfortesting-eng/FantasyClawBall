-- Initial schema for Fantasy ClawBall MVP backend.
-- Generated to mirror prisma/schema.prisma
CREATE TYPE "OwnerStatus" AS ENUM ('active', 'disabled');
CREATE TYPE "LeagueStatus" AS ENUM ('forming', 'active', 'completed', 'cancelled');
CREATE TYPE "AgentStatus" AS ENUM ('active', 'suspended', 'offline');
CREATE TYPE "WalletType" AS ENUM ('agent', 'league_vault', 'matchup_escrow');
CREATE TYPE "PolicyStatus" AS ENUM ('active', 'restricted', 'frozen');
CREATE TYPE "MatchupStatus" AS ENUM ('scheduled', 'escrow_pending', 'escrow_funded', 'finalized', 'settled', 'forfeit');
CREATE TYPE "EscrowStatus" AS ENUM ('pending', 'funded', 'released', 'refunded', 'forfeited');
CREATE TYPE "SettlementType" AS ENUM ('weekly_matchup', 'season_prize', 'refund');
CREATE TYPE "SettlementStatus" AS ENUM ('pending', 'submitted', 'confirmed', 'failed');
CREATE TYPE "MessageType" AS ENUM ('trash_talk', 'reaction', 'result_comment', 'announcement');
CREATE TYPE "Visibility" AS ENUM ('public', 'owner_visible', 'system');
CREATE TYPE "ModerationStatus" AS ENUM ('approved', 'blocked', 'flagged');
CREATE TYPE "LedgerEntryType" AS ENUM ('deposit', 'buy_in_lock', 'weekly_lock', 'escrow_release', 'refund', 'prize_payout', 'adjustment');
CREATE TYPE "Direction" AS ENUM ('credit', 'debit');
CREATE TYPE "ReferenceType" AS ENUM ('league', 'matchup', 'escrow', 'settlement', 'manual');
CREATE TYPE "ProviderType" AS ENUM ('scripted', 'openai', 'anthropic');

CREATE TABLE "owners" (
  "id" TEXT PRIMARY KEY,
  "display_name" TEXT NOT NULL,
  "email" TEXT,
  "telegram_handle" TEXT,
  "status" "OwnerStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE "leagues" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "season_label" TEXT NOT NULL,
  "max_agents" INTEGER NOT NULL,
  "buy_in_amount" DECIMAL(10,2) NOT NULL,
  "weekly_stake_amount" DECIMAL(10,2) NOT NULL,
  "season_weeks" INTEGER NOT NULL,
  "status" "LeagueStatus" NOT NULL DEFAULT 'forming',
  "ruleset_version" TEXT NOT NULL,
  "starts_at" TIMESTAMP NOT NULL,
  "ends_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE "agents" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT NOT NULL REFERENCES "owners"("id"),
  "league_id" TEXT NOT NULL REFERENCES "leagues"("id"),
  "name" TEXT NOT NULL,
  "persona_prompt" TEXT NOT NULL,
  "tone" TEXT NOT NULL,
  "provider_type" "ProviderType",
  "model_name" TEXT,
  "status" "AgentStatus" NOT NULL DEFAULT 'offline',
  "season_reserve_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "rivalry_notes" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE "wallets" (
  "id" TEXT PRIMARY KEY,
  "wallet_type" "WalletType" NOT NULL,
  "agent_id" TEXT UNIQUE REFERENCES "agents"("id"),
  "league_id" TEXT REFERENCES "leagues"("id"),
  "address" TEXT,
  "chain" TEXT,
  "asset_symbol" TEXT NOT NULL,
  "available_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "locked_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "policy_status" "PolicyStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE "matchups" (
  "id" TEXT PRIMARY KEY,
  "league_id" TEXT NOT NULL REFERENCES "leagues"("id"),
  "week_number" INTEGER NOT NULL,
  "agent_a_id" TEXT NOT NULL REFERENCES "agents"("id"),
  "agent_b_id" TEXT NOT NULL REFERENCES "agents"("id"),
  "agent_a_score" DECIMAL(10,2),
  "agent_b_score" DECIMAL(10,2),
  "winner_agent_id" TEXT REFERENCES "agents"("id"),
  "status" "MatchupStatus" NOT NULL DEFAULT 'scheduled',
  "escrow_id" TEXT UNIQUE,
  "settlement_id" TEXT UNIQUE,
  "result_source" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE "escrows" (
  "id" TEXT PRIMARY KEY,
  "league_id" TEXT NOT NULL REFERENCES "leagues"("id"),
  "matchup_id" TEXT NOT NULL UNIQUE REFERENCES "matchups"("id"),
  "escrow_wallet_id" TEXT NOT NULL,
  "agent_a_wallet_id" TEXT NOT NULL,
  "agent_b_wallet_id" TEXT NOT NULL,
  "stake_amount_per_side" DECIMAL(10,2) NOT NULL,
  "total_locked_amount" DECIMAL(10,2) NOT NULL,
  "status" "EscrowStatus" NOT NULL DEFAULT 'pending',
  "locked_at" TIMESTAMP,
  "released_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE "settlements" (
  "id" TEXT PRIMARY KEY,
  "league_id" TEXT NOT NULL REFERENCES "leagues"("id"),
  "matchup_id" TEXT UNIQUE REFERENCES "matchups"("id"),
  "settlement_type" "SettlementType" NOT NULL,
  "winner_agent_id" TEXT,
  "from_wallet_id" TEXT,
  "to_wallet_id" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" "SettlementStatus" NOT NULL DEFAULT 'pending',
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "tx_hash" TEXT,
  "trigger_source" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE TABLE "messages" (
  "id" TEXT PRIMARY KEY,
  "league_id" TEXT NOT NULL REFERENCES "leagues"("id"),
  "agent_id" TEXT NOT NULL REFERENCES "agents"("id"),
  "matchup_id" TEXT REFERENCES "matchups"("id"),
  "week_number" INTEGER,
  "channel_name" TEXT NOT NULL,
  "message_type" "MessageType" NOT NULL,
  "content" TEXT NOT NULL,
  "visibility" "Visibility" NOT NULL,
  "moderation_status" "ModerationStatus" NOT NULL,
  "posted_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ledger_entries" (
  "id" TEXT PRIMARY KEY,
  "league_id" TEXT REFERENCES "leagues"("id"),
  "agent_id" TEXT REFERENCES "agents"("id"),
  "wallet_id" TEXT NOT NULL REFERENCES "wallets"("id"),
  "entry_type" "LedgerEntryType" NOT NULL,
  "direction" "Direction" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "reference_type" "ReferenceType" NOT NULL,
  "reference_id" TEXT,
  "description" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "agent_policies" (
  "id" TEXT PRIMARY KEY,
  "agent_id" TEXT NOT NULL REFERENCES "agents"("id"),
  "max_weekly_stake" DECIMAL(10,2) NOT NULL,
  "can_send_discretionary_payments" BOOLEAN NOT NULL DEFAULT false,
  "can_post_public_messages" BOOLEAN NOT NULL DEFAULT true,
  "message_rate_limit_per_hour" INTEGER NOT NULL DEFAULT 20,
  "status" "PolicyStatus" NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL
);

CREATE INDEX "wallets_league_id_idx" ON "wallets"("league_id");
CREATE INDEX "matchups_league_id_week_number_idx" ON "matchups"("league_id", "week_number");
CREATE INDEX "ledger_entries_wallet_id_created_at_idx" ON "ledger_entries"("wallet_id", "created_at");

CREATE UNIQUE INDEX "matchups_league_id_week_number_agent_a_id_agent_b_id_key" ON "matchups"("league_id", "week_number", "agent_a_id", "agent_b_id");
CREATE UNIQUE INDEX "agent_policies_agent_id_key" ON "agent_policies"("agent_id");

ALTER TABLE "escrows" ADD CONSTRAINT "escrows_escrow_wallet_id_fkey" FOREIGN KEY ("escrow_wallet_id") REFERENCES "wallets"("id");
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_agent_a_wallet_id_fkey" FOREIGN KEY ("agent_a_wallet_id") REFERENCES "wallets"("id");
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_agent_b_wallet_id_fkey" FOREIGN KEY ("agent_b_wallet_id") REFERENCES "wallets"("id");
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_wallet_id_fkey" FOREIGN KEY ("from_wallet_id") REFERENCES "wallets"("id");
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id");
