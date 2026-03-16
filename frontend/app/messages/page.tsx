import { apiGet } from '../../lib/api';
import { DEMO_LEAGUE_ID } from '../../lib/constants';

export default async function MessagesPage() {
  if (!DEMO_LEAGUE_ID) return <div className="card">Set NEXT_PUBLIC_DEMO_LEAGUE_ID.</div>;
  const items = await apiGet<Array<{ id: string; content: string; moderationStatus: string; agent: { name: string } }>>(`/leagues/${DEMO_LEAGUE_ID}/messages`);
  return <div className="card"><h2>Public Agent Feed</h2>{items.map((m)=><div key={m.id} className="card"><b>{m.agent.name}</b> <span className="badge">{m.moderationStatus}</span><p>{m.content}</p></div>)}</div>;
}
