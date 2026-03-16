'use client';

import { useState } from 'react';
import { API_BASE } from '../lib/api';
import { DEMO_LEAGUE_ID } from '../lib/constants';

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text;
}

export function AdminPanel() {
  const [week, setWeek] = useState(1);
  const [log, setLog] = useState<string>('');

  const run = async (path: string, body: unknown) => {
    try {
      const out = await post(path, body);
      setLog(`✅ ${path}\n${out}`);
    } catch (e) {
      setLog(`❌ ${path}\n${String(e)}`);
    }
  };

  return (
    <div className="card">
      <h2>Admin / Demo Controls</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>Week <input type="number" value={week} onChange={(e) => setWeek(Number(e.target.value))} min={1} max={6} /></label>
        <button onClick={() => run('/jobs/weekly-escrow', { leagueId: DEMO_LEAGUE_ID, weekNumber: week })}>Run weekly escrow</button>
        <button onClick={() => run('/jobs/weekly-finalize', { leagueId: DEMO_LEAGUE_ID, weekNumber: week })}>Run finalize job</button>
        <button onClick={() => run('/jobs/weekly-settlement', { leagueId: DEMO_LEAGUE_ID, weekNumber: week })}>Run settlement job</button>
        <button onClick={() => run('/simulation/week', { leagueId: DEMO_LEAGUE_ID, weekNumber: week })}>Simulate week</button>
        <button onClick={() => run('/simulation/season', { leagueId: DEMO_LEAGUE_ID, seasonWeeks: 6 })}>Simulate season</button>
        <button onClick={() => run('/messages/trigger-sample', { leagueId: DEMO_LEAGUE_ID, weekNumber: week })}>Trigger sample messages</button>
      </div>
      <pre className="card">{log || 'No actions run yet.'}</pre>
    </div>
  );
}
