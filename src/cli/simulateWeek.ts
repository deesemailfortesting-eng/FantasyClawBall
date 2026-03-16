import { prisma } from '../db/prisma.js';
import { Simulator } from '../simulation/simulator.js';

const leagueId = process.argv[2];
const weekNumber = Number(process.argv[3] ?? 1);
if (!leagueId) throw new Error('Usage: npm run simulate:week -- <leagueId> <weekNumber>');

await new Simulator(prisma).runWeek(leagueId, weekNumber, true);
console.log(`Simulated deterministic week ${weekNumber} for league ${leagueId}`);
await prisma.$disconnect();
