import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';

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

export default function Standup() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const list = useQuery({
    queryKey: ['standup', date],
    queryFn: () => api<Standup[]>(`/reports/standup/today?date=${date}`),
  });
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Stand-up</h1>
          <p className="text-sm text-muted-foreground mt-1">Morning answers, {date}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(list.data ?? []).map((s) => (
          <div key={s.id} className="card-soft p-5 space-y-3 text-sm">
            <div className="chip-primary">vc #{s.vibecoderId}</div>
            <Field label="Завершил вчера">{s.completedYesterday}</Field>
            <Field label="Завершу сегодня">{s.willCompleteToday}</Field>
            <Field label="Deadline">{s.mainDeadline ?? '-'}</Field>
            <Field label="Blocker">{s.blocker ?? 'нет'}</Field>
            <Field label="К концу дня">{s.endOfDayDeliverable}</Field>
          </div>
        ))}
        {(list.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">Stand-ups за этот день не отправлены.</div>
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
