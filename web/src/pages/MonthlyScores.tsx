import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Lock, Pencil, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';

interface ScoreRow {
  vibecoderId: number;
  fullNameRu: string;
  bonusBaselineUzs: number;
  existing: any;
  auto: any;
  projectedTier: 'tier_100' | 'tier_70' | 'tier_40' | 'tier_0';
  projectedBonusUzs: number;
}

const TIER_STYLE: Record<ScoreRow['projectedTier'], { label: string; chip: string }> = {
  tier_100: { label: '100%', chip: 'chip-success' },
  tier_70: { label: '70%', chip: 'chip-primary' },
  tier_40: { label: '40%', chip: 'chip-warning' },
  tier_0: { label: '0%', chip: 'chip-danger' },
};

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Monthly scores</h1>
          <p className="text-sm text-muted-foreground mt-1">{ym} · auto-computed with PM overrides</p>
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={ym}
            onChange={(e) => navigate(`/scores/${e.target.value}`)}
            className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm"
          />
          <button
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${recompute.isPending ? 'animate-spin' : ''}`} /> Recompute
          </button>
        </div>
      </div>

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border/60 bg-muted/40">
              <th className="text-left font-medium px-5 py-3">Vibecoder</th>
              <th className="text-right font-medium px-2 py-3">Disc /10</th>
              <th className="text-right font-medium px-2 py-3">Deadl /25</th>
              <th className="text-right font-medium px-2 py-3">UX /20</th>
              <th className="text-right font-medium px-2 py-3">Biz /20</th>
              <th className="text-right font-medium px-2 py-3">Learn /15</th>
              <th className="text-right font-medium px-2 py-3">Expl /10</th>
              <th className="text-right font-medium px-2 py-3">Total</th>
              <th className="text-left font-medium px-2 py-3">Tier</th>
              <th className="text-right font-medium px-2 py-3">Bonus UZS</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.data?.rows.map((r) => {
              const x = r.existing ?? r.auto;
              const locked = !!r.existing?.lockedAt;
              const tier = TIER_STYLE[r.projectedTier];
              return (
                <tr key={r.vibecoderId} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.fullNameRu} id={r.vibecoderId} />
                      <div>
                        <div className="font-medium">{r.fullNameRu}</div>
                        {locked && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <Lock className="h-3 w-3" /> locked
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">{x.disciplineReporting}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{x.deadlineOwnership}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{x.uxuiTaste}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{x.businessThinking}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{x.professionalLearning}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{x.simpleExplanation}</td>
                  <td className="px-2 py-3 text-right tabular-nums font-semibold">{x.total}</td>
                  <td className="px-2 py-3"><span className={tier.chip}>{tier.label}</span></td>
                  <td className="px-2 py-3 text-right tabular-nums">{r.projectedBonusUzs.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    {!locked && (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setEditing(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1 text-xs hover:bg-muted"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Lock month ${ym} for ${r.fullNameRu}? Cannot be undone.`))
                              lock.mutate(r.vibecoderId);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-warning-soft text-warning px-2.5 py-1 text-xs hover:bg-warning/10"
                        >
                          <Lock className="h-3 w-3" /> Lock
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {(list.data?.rows ?? []).length === 0 && (
              <tr>
                <td colSpan={11} className="py-10 text-center text-muted-foreground text-sm">
                  No vibecoders to score yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
  const total = fields.reduce((acc, [k]) => acc + (Number((v as any)[k]) || 0), 0);
  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-10">
      <div className="card-soft p-6 w-full max-w-md space-y-3 shadow-elevated">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{row.fullNameRu}</h2>
            <p className="text-xs text-muted-foreground">Override scores</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{total}</div>
            <div className="text-[10px] text-muted-foreground">/ 100</div>
          </div>
        </div>
        {fields.map(([key, label, max]) => (
          <div key={String(key)}>
            <label className="text-xs font-medium text-muted-foreground">
              {label} <span className="text-foreground/60">/ {max}</span>
            </label>
            <input
              type="number"
              min={0}
              max={max}
              value={(v as any)[key]}
              onChange={(e) => setV({ ...v, [key]: Number(e.target.value) })}
              className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-medium text-muted-foreground">PM notes</label>
          <textarea
            rows={3}
            value={v.pmNotes}
            onChange={(e) => setV({ ...v, pmNotes: e.target.value })}
            className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSave(v)}
            disabled={busy}
            className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onCancel} className="rounded-xl border border-border/70 px-4 py-2 text-sm hover:bg-muted">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
