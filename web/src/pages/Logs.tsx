import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const TYPES = [
  { key: 'design', label: 'Design refs' },
  { key: 'business', label: 'Business notes' },
  { key: 'learning', label: 'Learning' },
  { key: 'explain', label: 'Explain' },
  { key: 'book', label: 'Books' },
];

export default function Logs() {
  const { type = 'design' } = useParams();
  const navigate = useNavigate();
  const list = useQuery({
    queryKey: ['logs', type],
    queryFn: () => api<any[]>(`/growth-logs/${type}`),
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">Growth logs</h1>
        <p className="text-sm text-muted-foreground mt-1">All entries from the bot.</p>
      </div>

      <div className="flex gap-1 card-soft p-1 w-fit">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(`/logs/${t.key}`)}
            className={`px-4 py-1.5 rounded-lg text-sm transition ${
              type === t.key ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(list.data ?? []).map((r) => (
          <div key={r.id} className="card-soft p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="chip-primary">vc #{r.vibecoderId}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-muted/40 rounded-lg p-3 max-h-72 overflow-auto">
{JSON.stringify(stripNoise(r), null, 2)}
            </pre>
          </div>
        ))}
        {(list.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground card-soft p-6">Нет записей.</div>
        )}
      </div>
    </div>
  );
}

function stripNoise(r: any) {
  const { id, vibecoderId, createdAt, notionPageId, ...rest } = r;
  return rest;
}
