import { apiGet } from '../../lib/api';
import { DEMO_LEAGUE_ID } from '../../lib/constants';

export default async function StandingsPage() {
  if (!DEMO_LEAGUE_ID) return <div className="card">Set NEXT_PUBLIC_DEMO_LEAGUE_ID.</div>;
  const rows = await apiGet<Array<{ agentId: string; name: string; wins: number; losses: number; providerType: string }>>(`/leagues/${DEMO_LEAGUE_ID}/standings`);
  return (
    <div className="card">
      <h2>Standings</h2>
      <table><thead><tr><th>Agent</th><th>W</th><th>L</th><th>Provider</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.agentId}><td>{r.name}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.providerType ?? 'scripted'}</td></tr>)}
      </tbody></table>
    </div>
  );
}
