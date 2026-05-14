import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api/client';

interface ScoreRow {
  vibecoderId: number;
  fullNameRu: string;
  bonusBaselineUzs: number;
  existing: any;
  auto: any;
  projectedTier: 'tier_100' | 'tier_70' | 'tier_40' | 'tier_0';
  projectedBonusUzs: number;
}

export default function MonthlyScores() {
  const { yyyymm } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ym = yyyymm ?? defaultYm;
  const [editing, setEditing] = useState<ScoreRow | null>(null);

  const list = useQuery({
    queryKey: ['scores', ym],
    queryFn: () => api<{ yearMonth: string; rows: ScoreRow[] }>(`/scores/${ym}`),
  });

  const recompute = useMutation({
    mutationFn: () => api(`/scores/${ym}/recompute`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scores', ym] }),
  });

  const patch = useMutation({
    mutationFn: (data: { vibecoderId: number; payload: any }) =>
      api(`/scores/${ym}/${data.vibecoderId}`, { method: 'PATCH', body: JSON.stringify(data.payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scores', ym] });
      setEditing(null);
    },
  });

  const lock = useMutation({
    mutationFn: (vcId: number) => api(`/scores/${ym}/${vcId}/lock`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scores', ym] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Monthly scores — {ym}</h1>
        <div className="flex gap-2">
          <input
            type="month"
            value={ym}
            onChange={(e) => navigate(`/scores/${e.target.value}`)}
            className="rounded border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => recompute.mutate()}
            className="rounded border px-3 py-2 text-sm"
            disabled={recompute.isPending}
          >
            Recompute auto
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr>
            <th className="py-2">Vibecoder</th>
            <th>Disc/10</th>
            <th>Deadl/25</th>
            <th>UX/20</th>
            <th>Biz/20</th>
            <th>Learn/15</th>
            <th>Expl/10</th>
            <th>Total</th>
            <th>Tier</th>
            <th>Bonus UZS</th>
            <th>State</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.data?.rows.map((r) => {
            const x = r.existing ?? r.auto;
            return (
              <tr key={r.vibecoderId} className="border-b">
                <td className="py-2">{r.fullNameRu}</td>
                <td>{x.disciplineReporting}</td>
                <td>{x.deadlineOwnership}</td>
                <td>{x.uxuiTaste}</td>
                <td>{x.businessThinking}</td>
                <td>{x.professionalLearning}</td>
                <td>{x.simpleExplanation}</td>
                <td className="font-medium">{x.total}</td>
                <td>{r.projectedTier.replace('tier_', '')}%</td>
                <td>{r.projectedBonusUzs.toLocaleString()}</td>
                <td>{r.existing?.lockedAt ? '🔒' : '✏️'}</td>
                <td>
                  {!r.existing?.lockedAt && (
                    <>
                      <button onClick={() => setEditing(r)} className="text-xs text-primary underline mr-2">
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Lock month ${ym} for ${r.fullNameRu}? Cannot be undone.`))
                            lock.mutate(r.vibecoderId);
                        }}
                        className="text-xs text-amber-600 underline"
                      >
                        Lock
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editing && (
        <ScoreEditor
          row={editing}
          onCancel={() => setEditing(null)}
          onSave={(payload) => patch.mutate({ vibecoderId: editing.vibecoderId, payload })}
          busy={patch.isPending}
        />
      )}
    </div>
  );
}

function ScoreEditor({
  row,
  onCancel,
  onSave,
  busy,
}: {
  row: ScoreRow;
  onCancel: () => void;
  onSave: (payload: any) => void;
  busy: boolean;
}) {
  const x = row.existing ?? row.auto;
  const [v, setV] = useState({
    disciplineReporting: x.disciplineReporting,
    deadlineOwnership: x.deadlineOwnership,
    uxuiTaste: x.uxuiTaste,
    businessThinking: x.businessThinking,
    professionalLearning: x.professionalLearning,
    simpleExplanation: x.simpleExplanation,
    pmNotes: x.pmNotes ?? '',
  });
  const fields: Array<[keyof typeof v, string, number]> = [
    ['disciplineReporting', 'Discipline & Reporting', 10],
    ['deadlineOwnership', 'Deadline & Ownership', 25],
    ['uxuiTaste', 'UX/UI Taste', 20],
    ['businessThinking', 'Business Thinking', 20],
    ['professionalLearning', 'Professional Learning', 15],
    ['simpleExplanation', 'Simple Explanation', 10],
  ];
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
      <div className="bg-card border rounded-lg p-6 w-full max-w-md space-y-3">
        <h2 className="text-lg font-semibold">Override scores — {row.fullNameRu}</h2>
        {fields.map(([key, label, max]) => (
          <div key={String(key)}>
            <label className="text-xs text-muted-foreground">
              {label} (max {max})
            </label>
            <input
              type="number"
              min={0}
              max={max}
              value={(v as any)[key]}
              onChange={(e) => setV({ ...v, [key]: Number(e.target.value) })}
              className="w-full rounded border bg-background px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-muted-foreground">PM notes</label>
          <textarea
            rows={3}
            value={v.pmNotes}
            onChange={(e) => setV({ ...v, pmNotes: e.target.value })}
            className="w-full rounded border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(v)}
            disabled={busy}
            className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onCancel} className="rounded border px-3 py-2 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
