import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

interface Status {
  id: number;
  vibecoderId: number;
  sentAt: string;
  currentTask: string;
  sinceLast: string | null;
  doingNow: string | null;
  blocker: string | null;
  onTrack: boolean;
}

export default function StatusGrid() {
  const list = useQuery({
    queryKey: ['status', 'recent'],
    queryFn: () => api<Status[]>(`/reports/status/active`),
    refetchInterval: 30_000,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Status updates (last 12h)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(list.data ?? []).map((s) => (
          <div key={s.id} className="rounded border bg-card p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">vc#{s.vibecoderId}</span>
              <span className="text-xs">{new Date(s.sentAt).toLocaleString()}</span>
            </div>
            <div className="font-medium">{s.currentTask}</div>
            <div className="text-muted-foreground">с прошлого: {s.sinceLast ?? '-'}</div>
            <div>сейчас: {s.doingNow ?? '-'}</div>
            <div>blocker: {s.blocker ?? 'нет'}</div>
            <div className={s.onTrack ? 'text-green-600' : 'text-amber-600'}>
              {s.onTrack ? '✅ on track' : '⚠️ off track'}
            </div>
          </div>
        ))}
        {(list.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">
            Нет недавних status updates. Они появятся когда менеджер пошлёт /offline в бот.
          </div>
        )}
      </div>
    </div>
  );
}
