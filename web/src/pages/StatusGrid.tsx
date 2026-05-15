import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';

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
interface Vibecoder {
  id: number;
  fullNameRu: string;
}

export default function StatusGrid() {
  const list = useQuery({
    queryKey: ['status', 'recent'],
    queryFn: () => api<Status[]>(`/reports/status/active`),
    refetchInterval: 30_000,
  });
  const team = useQuery({ queryKey: ['vibecoders'], queryFn: () => api<Vibecoder[]>('/vibecoders') });
  const nameById = useMemo(
    () => new Map((team.data ?? []).map((v) => [v.id, v.fullNameRu] as const)),
    [team.data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">Status updates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Последние 12 часов. Бот сам спрашивает /status в 10:00 / 12:00 / 14:00 / 16:00 по Tashkent.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(list.data ?? []).map((s) => {
          const name = nameById.get(s.vibecoderId) ?? `vc#${s.vibecoderId}`;
          return (
            <div key={s.id} className="card-soft p-5 text-sm space-y-2">
              <div className="flex items-center justify-between mb-1 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={name} id={s.vibecoderId} size="sm" />
                  <span className="font-medium truncate">{name}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(s.sentAt).toLocaleString()}
                </span>
              </div>
              <div className="font-semibold">{s.currentTask}</div>
              <div className="text-muted-foreground">с прошлого: {s.sinceLast ?? '—'}</div>
              <div>сейчас: {s.doingNow ?? '—'}</div>
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
          );
        })}
        {(list.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground card-soft p-6 md:col-span-2">
            За последние 12 часов status updates не было.
          </div>
        )}
      </div>
    </div>
  );
}
