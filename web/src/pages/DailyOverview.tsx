import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';

interface Report {
  id: number;
  vibecoderId: number;
  reportDate: string;
  status: 'on_time' | 'late' | 'missed';
  didToday: string;
  completed: string | null;
  inProgress: string | null;
  blockers: string | null;
  plansTomorrow: string;
  proofLinks: string[];
  hasProof: boolean;
  keptPromise: boolean | null;
}

interface Vibecoder { id: number; fullNameRu: string; active: boolean }

export default function DailyOverview() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const reports = useQuery({ queryKey: ['reports', date], queryFn: () => api<Report[]>(`/reports?date=${date}`) });
  const team = useQuery({ queryKey: ['vibecoders'], queryFn: () => api<Vibecoder[]>('/vibecoders') });
  const [selected, setSelected] = useState<Report | null>(null);

  const byVc = new Map((reports.data ?? []).map((r) => [r.vibecoderId, r] as const));
  const active = team.data?.filter((v) => v.active) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Daily — {date}</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border bg-background px-3 py-2 text-sm"
        />
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr>
            <th className="py-2">Vibecoder</th>
            <th>Status</th>
            <th>Proof</th>
            <th>Promise</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {active.map((vc) => {
            const r = byVc.get(vc.id);
            const status = !r || !r.didToday ? 'pending' : r.status;
            return (
              <tr key={vc.id} className="border-b">
                <td className="py-2">{vc.fullNameRu}</td>
                <td>
                  <Badge status={status} />
                </td>
                <td>{r?.hasProof ? '🔗' : ''}</td>
                <td>{r?.keptPromise == null ? '' : r.keptPromise ? '✅' : '❌'}</td>
                <td>
                  {r && r.didToday && (
                    <button onClick={() => setSelected(r)} className="text-xs text-primary underline">
                      Open
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
          <div className="bg-card border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-3">
            <h2 className="text-lg font-semibold">Report · {selected.reportDate}</h2>
            <Field label="Сделал">{selected.didToday}</Field>
            <Field label="Завершил">{selected.completed ?? '-'}</Field>
            <Field label="В процессе">{selected.inProgress ?? '-'}</Field>
            <Field label="Blockers">{selected.blockers ?? 'нет'}</Field>
            <Field label="Завтра">{selected.plansTomorrow}</Field>
            {selected.proofLinks.length > 0 && (
              <Field label="Proof">
                <ul className="list-disc list-inside">
                  {selected.proofLinks.map((u) => (
                    <li key={u}>
                      <a href={u} target="_blank" rel="noreferrer" className="text-primary underline">
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              </Field>
            )}
            <button onClick={() => setSelected(null)} className="rounded border px-3 py-2 text-sm">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    on_time: 'bg-green-100 text-green-700',
    late: 'bg-amber-100 text-amber-700',
    missed: 'bg-red-100 text-red-700',
    pending: 'bg-muted text-muted-foreground',
  };
  return <span className={`rounded px-2 py-0.5 text-xs ${colors[status] ?? ''}`}>{status}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{children}</div>
    </div>
  );
}
