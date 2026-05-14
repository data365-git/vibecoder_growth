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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Growth logs</h1>
      <div className="flex gap-2 border-b">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(`/logs/${t.key}`)}
            className={`px-3 py-2 text-sm border-b-2 ${type === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(list.data ?? []).map((r) => (
          <div key={r.id} className="rounded border bg-card p-3 text-sm space-y-1">
            <div className="text-xs text-muted-foreground">
              vc#{r.vibecoderId} · {new Date(r.createdAt).toLocaleString()}
              {r.notionPageId ? ' · 📄 in Notion' : ''}
            </div>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(r, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
