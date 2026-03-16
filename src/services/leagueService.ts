import type { PrismaClient, ProviderType } from '@prisma/client';
import { DomainError } from '../utils/errors.js';

export class LeagueService {
  constructor(private db: PrismaClient) {}

  async createLeague(input: {
    name: string; seasonLabel: string; maxAgents: number; buyInAmount: number; weeklyStakeAmount: number; seasonWeeks: number;
    startsAt: string; endsAt: string; rulesetVersion: string;
  }) {
    return this.db.league.create({ data: { ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) } });
  }

  async joinLeague(input: {
    leagueId: string; ownerId: string; name: string; personaPrompt: string; tone: string; providerType?: ProviderType; modelName?: string;
  }) {
    const league = await this.db.league.findUnique({ where: { id: input.leagueId }, include: { agents: true } });
    if (!league) throw new DomainError('League not found', 404);
    if (league.agents.length >= league.maxAgents) throw new DomainError('League is full');
    return this.db.agent.create({ data: { ...input, status: 'offline', seasonReserveBalance: 0 } });
  }

  async activateAgent(agentId: string) {
    const agent = await this.db.agent.findUnique({ where: { id: agentId }, include: { league: true, wallet: true } });
    if (!agent || !agent.wallet) throw new DomainError('Agent or wallet missing', 404);
    const required = Number(agent.league.buyInAmount) + Number(agent.league.weeklyStakeAmount) * agent.league.seasonWeeks;
    if (Number(agent.wallet.availableBalance) < required) throw new DomainError('Agent cannot join unless prefunded');

    return this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { id: agent.wallet!.id },
        data: {
          availableBalance: Number(agent.wallet!.availableBalance) - required,
          lockedBalance: Number(agent.wallet!.lockedBalance) + required,
        },
      });
      const updatedAgent = await tx.agent.update({ where: { id: agentId }, data: { status: 'active', seasonReserveBalance: required } });
      await tx.ledgerEntry.createMany({
        data: [
          { walletId: wallet.id, amount: Number(agent.league.buyInAmount), direction: 'debit', entryType: 'buy_in_lock', referenceType: 'league', referenceId: agent.leagueId, description: 'Buy-in lock from available', leagueId: agent.leagueId, agentId },
          { walletId: wallet.id, amount: Number(agent.league.weeklyStakeAmount) * agent.league.seasonWeeks, direction: 'debit', entryType: 'weekly_lock', referenceType: 'league', referenceId: agent.leagueId, description: 'Weekly reserve lock from available', leagueId: agent.leagueId, agentId },
          { walletId: wallet.id, amount: required, direction: 'credit', entryType: 'adjustment', referenceType: 'league', referenceId: agent.leagueId, description: 'Internal lock bucket increase (available->locked)', leagueId: agent.leagueId, agentId },
        ],
      });
      return updatedAgent;
    });
  }
}
