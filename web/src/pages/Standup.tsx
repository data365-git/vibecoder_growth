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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stand-up — {date}</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(list.data ?? []).map((s) => (
          <div key={s.id} className="rounded-lg border bg-card p-4 space-y-2 text-sm">
            <div className="text-xs text-muted-foreground">vc#{s.vibecoderId}</div>
            <Field label="Завершил вчера">{s.completedYesterday}</Field>
            <Field label="Завершу сегодня">{s.willCompleteToday}</Field>
            <Field label="Deadline">{s.mainDeadline ?? '-'}</Field>
            <Field label="Blocker">{s.blocker ?? 'нет'}</Field>
            <Field label="К концу дня">{s.endOfDayDeliverable}</Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{children}</div>
    </div>
  );
}
