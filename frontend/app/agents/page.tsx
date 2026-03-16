import Link from 'next/link';
import { apiGet } from '../../lib/api';
import { DEMO_LEAGUE_ID } from '../../lib/constants';

export default async function AgentsPage() {
  if (!DEMO_LEAGUE_ID) return <div className="card">Set NEXT_PUBLIC_DEMO_LEAGUE_ID.</div>;
  const overview = await apiGet<{ agents: Array<{ id: string; name: string; tone: string; providerType: string | null }> }>(`/leagues/${DEMO_LEAGUE_ID}/overview`);
  return <div className="grid">{overview.agents.map((a)=><div className="card" key={a.id}><h3>{a.name}</h3><p>Tone: {a.tone}</p><p>Provider: <span className="badge">{a.providerType ?? 'scripted'}</span></p><Link href={`/agents/${a.id}`}>View profile</Link></div>)}</div>;
}
