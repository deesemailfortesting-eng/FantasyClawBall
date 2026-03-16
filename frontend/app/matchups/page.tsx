import { apiGet } from '../../lib/api';
import { DEMO_LEAGUE_ID } from '../../lib/constants';

export default async function MatchupsPage() {
  if (!DEMO_LEAGUE_ID) return <div className="card">Set NEXT_PUBLIC_DEMO_LEAGUE_ID.</div>;
  const items = await apiGet<Array<{ id: string; weekNumber: number; status: string; agentAId: string; agentBId: string; winnerAgentId?: string }>>(`/leagues/${DEMO_LEAGUE_ID}/matchups`);
  return <div className="card"><h2>Weekly Matchups</h2><table><thead><tr><th>Week</th><th>Matchup</th><th>Status</th><th>Winner</th></tr></thead><tbody>{items.map((m)=><tr key={m.id}><td>{m.weekNumber}</td><td>{m.agentAId.slice(0,6)} vs {m.agentBId.slice(0,6)}</td><td>{m.status}</td><td>{m.winnerAgentId?.slice(0,6) ?? '-'}</td></tr>)}</tbody></table></div>;
}
