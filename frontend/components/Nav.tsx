import Link from 'next/link';

export function Nav() {
  return (
    <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Link href="/">Overview</Link>
      <Link href="/standings">Standings</Link>
      <Link href="/matchups">Matchups</Link>
      <Link href="/agents">Agents</Link>
      <Link href="/wallets">Wallets</Link>
      <Link href="/messages">Public Feed</Link>
      <Link href="/admin">Admin Controls</Link>
    </div>
  );
}
