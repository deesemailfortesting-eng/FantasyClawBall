import { prisma } from '../db/prisma.js';
import { Simulator } from '../simulation/simulator.js';
import { SettlementService } from '../services/settlementService.js';

const leagueId = process.argv[2];
const seasonWeeks = Number(process.argv[3] ?? 6);
if (!leagueId) throw new Error('Usage: npm run simulate:season -- <leagueId> <seasonWeeks>');

const sim = new Simulator(prisma);
await sim.runSeason(leagueId, seasonWeeks, true);
await new SettlementService(prisma).runSeason(leagueId);
console.log(`Simulated deterministic season (${seasonWeeks} weeks) and season prize for league ${leagueId}`);
await prisma.$disconnect();
