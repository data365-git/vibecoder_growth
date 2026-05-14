import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">Status updates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live for the last 12 hours · only while a manager is in /offline mode
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(list.data ?? []).map((s) => (
          <div key={s.id} className="card-soft p-5 text-sm space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="chip-primary">vc #{s.vibecoderId}</span>
              <span className="text-xs text-muted-foreground">{new Date(s.sentAt).toLocaleString()}</span>
            </div>
            <div className="font-semibold">{s.currentTask}</div>
            <div className="text-muted-foreground">с прошлого: {s.sinceLast ?? '-'}</div>
            <div>сейчас: {s.doingNow ?? '-'}</div>
            <div>blocker: {s.blocker ?? 'нет'}</div>
            <div
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                s.onTrack ? 'text-success' : 'text-warning'
              }`}
            >
              {s.onTrack ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {s.onTrack ? 'on track' : 'off track'}
            </div>
          </div>
        ))}
        {(list.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground card-soft p-6">
            Нет недавних status updates. Они появятся когда менеджер пошлёт /offline в бот.
          </div>
        )}
      </div>
    </div>
  );
}
