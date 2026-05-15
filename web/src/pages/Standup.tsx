import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';

interface Standup {
  id: number;
  vibecoderId: number;
  standupDate: string;
  completedYesterday: string;
  willCompleteToday: string;
  mainDeadline: string | null;
  blocker: string | null;
  endOfDayDeliverable: string;
}
interface Vibecoder {
  id: number;
  fullNameRu: string;
}

export default function Standup() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const list = useQuery({
    queryKey: ['standup', date],
    queryFn: () => api<Standup[]>(`/reports/standup/today?date=${date}`),
  });
  const team = useQuery({ queryKey: ['vibecoders'], queryFn: () => api<Vibecoder[]>('/vibecoders') });

  const nameById = useMemo(
    () => new Map((team.data ?? []).map((v) => [v.id, v.fullNameRu] as const)),
    [team.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Stand-up</h1>
          <p className="text-sm text-muted-foreground mt-1">Утренние ответы за {date}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Дата stand-up"
          className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(list.data ?? []).map((s) => {
          const name = nameById.get(s.vibecoderId) ?? `vc#${s.vibecoderId}`;
          return (
            <div key={s.id} className="card-soft p-5 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={name} id={s.vibecoderId} />
                <span className="font-medium">{name}</span>
              </div>
              <Field label="Завершил вчера">{s.completedYesterday}</Field>
              <Field label="Завершу сегодня">{s.willCompleteToday}</Field>
              <Field label="Deadline">{s.mainDeadline ?? '—'}</Field>
              <Field label="Blocker">{s.blocker ?? 'нет'}</Field>
              <Field label="К концу дня">{s.endOfDayDeliverable}</Field>
            </div>
          );
        })}
        {list.isLoading && (
          <div className="text-sm text-muted-foreground">Загрузка…</div>
        )}
        {!list.isLoading && (list.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">Stand-up за этот день никто не отправлял.</div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap text-foreground mt-0.5">{children}</div>
    </div>
  );
}
