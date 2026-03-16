import { apiGet } from '../lib/api';
import { DEMO_LEAGUE_ID } from '../lib/constants';

type Overview = {
  league: { name: string; seasonLabel: string; buyInAmount: number; weeklyStakeAmount: number; seasonWeeks: number };
  agents: Array<{ id: string; name: string; providerType: string | null }>;
  escrows: Array<{ id: string; status: string; totalLockedAmount: number }>;
  settlements: Array<{ id: string; status: string; amount: number }>;
};

export default async function Page() {
  if (!DEMO_LEAGUE_ID) return <div className="card">Set NEXT_PUBLIC_DEMO_LEAGUE_ID to view league data.</div>;
  const data = await apiGet<Overview>(`/leagues/${DEMO_LEAGUE_ID}/overview`);
  return (
    <div className="grid">
      <div className="card">
        <h2>{data.league.name}</h2>
        <p>{data.league.seasonLabel}</p>
        <p>Buy-in: ${String(data.league.buyInAmount)} • Weekly stake: ${String(data.league.weeklyStakeAmount)} • Weeks: {data.league.seasonWeeks}</p>
      </div>
      <div className="card"><h3>Agents</h3><p>{data.agents.length} total</p></div>
      <div className="card"><h3>Escrows</h3><p>{data.escrows.length} records</p></div>
      <div className="card"><h3>Settlements</h3><p>{data.settlements.length} records</p></div>
    </div>
  );
}
