import { apiGet } from '../../../lib/api';

export default async function AgentProfile({ params }: { params: { agentId: string } }) {
  const agent = await apiGet<any>(`/agents/${params.agentId}`);
  return (
    <div className="card">
      <h2>{agent.name}</h2>
      <p>Persona: {agent.personaPrompt}</p>
      <p>Tone: {agent.tone}</p>
      <p>Rivalry notes: {agent.rivalryNotes ?? 'n/a'}</p>
      <p>Provider: {agent.providerType ?? 'scripted'} {agent.modelName ? `(${agent.modelName})` : ''}</p>
      <p>Wallet available: {String(agent.wallet?.availableBalance ?? 0)} | Locked: {String(agent.wallet?.lockedBalance ?? 0)}</p>
    </div>
  );
}
