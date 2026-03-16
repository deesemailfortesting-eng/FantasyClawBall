import { prisma } from '../db/prisma.js';
import { weeklyEscrowJob } from '../jobs/weeklyEscrowJob.js';
import { weeklyFinalizeJob } from '../jobs/weeklyFinalizeJob.js';
import { weeklySettlementJob } from '../jobs/weeklySettlementJob.js';

const leagueId = process.argv[2];
const weekNumber = Number(process.argv[3] ?? 1);
if (!leagueId) throw new Error('Usage: npm run jobs:run -- <leagueId> <weekNumber>');

await weeklyEscrowJob(prisma, leagueId, weekNumber);
await weeklyFinalizeJob(prisma, leagueId, weekNumber);
await weeklySettlementJob(prisma, leagueId, weekNumber);
console.log(`Ran weekly jobs for league ${leagueId}, week ${weekNumber}`);
await prisma.$disconnect();
