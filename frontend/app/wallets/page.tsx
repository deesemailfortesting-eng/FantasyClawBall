import { apiGet } from '../../lib/api';
import { DEMO_LEAGUE_ID } from '../../lib/constants';

export default async function WalletsPage() {
  if (!DEMO_LEAGUE_ID) return <div className="card">Set NEXT_PUBLIC_DEMO_LEAGUE_ID.</div>;
  const overview = await apiGet<{ wallets: Array<{ id: string; walletType: string; availableBalance: number; lockedBalance: number; policyStatus: string; agentId?: string }> }>(`/leagues/${DEMO_LEAGUE_ID}/overview`);
  return <div className="card"><h2>Wallet / Reserve Status</h2><table><thead><tr><th>Wallet</th><th>Type</th><th>Available</th><th>Locked</th><th>Policy</th></tr></thead><tbody>{overview.wallets.map((w)=><tr key={w.id}><td>{w.agentId?.slice(0,6) ?? w.id.slice(0,6)}</td><td>{w.walletType}</td><td>{String(w.availableBalance)}</td><td>{String(w.lockedBalance)}</td><td>{w.policyStatus}</td></tr>)}</tbody></table></div>;
}
