import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  defaultAssetSymbol: process.env.DEFAULT_ASSET_SYMBOL ?? 'USDC',
  openAiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  moderationProvider: process.env.MODERATION_PROVIDER ?? 'rules',
  simulationSeed: Number(process.env.SIMULATION_SEED ?? 42),
};
