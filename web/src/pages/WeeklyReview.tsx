import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface DesignRef {
  id: number;
  refUrl: string;
  refImageUrl: string | null;
  observations: string[];
  appliedInTask: string | null;
  createdAt: string;
}
interface BusinessNote {
  id: number;
  sourceUrl: string;
  sourceType: string;
  fiveInsights: string[];
  clientPain: string;
  createdAt: string;
}
interface LearningNote {
  id: number;
  sourceUrl: string;
  topic: string;
  threeTakeaways: string[];
  applicationText: string;
  createdAt: string;
}
interface ExplainNote {
  id: number;
  technicalVersion: string;
  simpleVersion: string;
  metaphor: string;
  createdAt: string;
}
interface ExistingReview {
  id: number;
  designRefIds: number[];
  businessNoteId: number | null;
  learningNoteId: number | null;
  explainNoteId: number | null;
  improvementApplied: string | null;
  taskExample: string | null;
  managerNotes: string | null;
  reviewedAt: string | null;
}
interface WeeklyRow {
  vibecoderId: number;
  fullNameRu: string;
  designRefs: DesignRef[];
  businessNotes: BusinessNote[];
  learningNotes: LearningNote[];
  explainNotes: ExplainNote[];
  existing: ExistingReview | null;
}
interface WeeklyResp {
  weekStart: string;
  rangeStart: string;
  rangeEnd: string;
  rows: WeeklyRow[];
}

function getCurrentMondayYmd(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday.toISOString().slice(0, 10);
}

function shiftWeek(ymd: string, weeks: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + weeks * 7));
  return dt.toISOString().slice(0, 10);
}

export default function WeeklyReview() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(getCurrentMondayYmd());
  const [selectedVc, setSelectedVc] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ['weekly', weekStart],
    queryFn: () => api<WeeklyResp>(`/weekly?weekStart=${weekStart}`),
  });

  const row = useMemo(
    () => list.data?.rows.find((r) => r.vibecoderId === selectedVc) ?? list.data?.rows[0],
    [list.data, selectedVc],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Weekly review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.data?.rangeStart} → {list.data?.rangeEnd}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
            className="rounded-xl border border-border/70 bg-card px-3 py-2 text-sm hover:bg-muted"
          >
            ◀ Prev
          </button>
          <button
            onClick={() => setWeekStart(getCurrentMondayYmd())}
            className="rounded-xl border border-border/70 bg-card px-3 py-2 text-sm hover:bg-muted"
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
            className="rounded-xl border border-border/70 bg-card px-3 py-2 text-sm hover:bg-muted"
          >
            Next ▶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 lg:col-span-3 card-soft p-2 space-y-1">
          {(list.data?.rows ?? []).map((r) => {
            const reviewed = !!r.existing?.reviewedAt;
            const isActive = (selectedVc ?? list.data?.rows[0]?.vibecoderId) === r.vibecoderId;
            return (
              <button
                key={r.vibecoderId}
                onClick={() => setSelectedVc(r.vibecoderId)}
                className={`block w-full text-left rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{r.fullNameRu}</span>
                  {reviewed ? (
                    <span className="chip-success text-[10px] py-0">reviewed</span>
                  ) : (
                    <span className="chip bg-muted text-muted-foreground text-[10px] py-0">pending</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {r.designRefs.length}d · {r.businessNotes.length}b · {r.learningNotes.length}l · {r.explainNotes.length}e
                </div>
              </button>
            );
          })}
          {(list.data?.rows ?? []).length === 0 && (
            <div className="text-xs text-muted-foreground p-3">Нет активных vibecoder’ов.</div>
          )}
        </aside>

        <section className="col-span-12 lg:col-span-9 space-y-4">
          {row ? (
            <div className="card-soft p-6">
              <ReviewPanel
                key={`${weekStart}-${row.vibecoderId}`}
                row={row}
                weekStart={weekStart}
                onSaved={() => qc.invalidateQueries({ queryKey: ['weekly', weekStart] })}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground card-soft p-6">Загрузка…</div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReviewPanel({
  row,
  weekStart,
  onSaved,
}: {
  row: WeeklyRow;
  weekStart: string;
  onSaved: () => void;
}) {
  const existing = row.existing;
  const [designIds, setDesignIds] = useState<number[]>(existing?.designRefIds ?? []);
  const [businessId, setBusinessId] = useState<number | null>(existing?.businessNoteId ?? null);
  const [learningId, setLearningId] = useState<number | null>(existing?.learningNoteId ?? null);
  const [explainId, setExplainId] = useState<number | null>(existing?.explainNoteId ?? null);
  const [improvement, setImprovement] = useState(existing?.improvementApplied ?? '');
  const [taskExample, setTaskExample] = useState(existing?.taskExample ?? '');
  const [managerNotes, setManagerNotes] = useState(existing?.managerNotes ?? '');

  const save = useMutation({
    mutationFn: (markReviewed: boolean) =>
      api('/weekly', {
        method: 'POST',
        body: JSON.stringify({
          vibecoderId: row.vibecoderId,
          weekStart,
          designRefIds: designIds.slice(0, 3),
          businessNoteId: businessId,
          learningNoteId: learningId,
          explainNoteId: explainId,
          improvementApplied: improvement || null,
          taskExample: taskExample || null,
          managerNotes: managerNotes || null,
          markReviewed,
        }),
      }),
    onSuccess: () => onSaved(),
  });

  const toggleDesign = (id: number) => {
    if (designIds.includes(id)) setDesignIds(designIds.filter((x) => x !== id));
    else if (designIds.length < 3) setDesignIds([...designIds, id]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{row.fullNameRu}</h2>
        <div className="text-xs text-muted-foreground">
          {existing?.reviewedAt
            ? `Reviewed ${new Date(existing.reviewedAt).toLocaleString()}`
            : 'Not reviewed yet'}
        </div>
      </div>

      <section>
        <h3 className="font-medium text-sm mb-2">Design refs · выбери до 3 лучших</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {row.designRefs.map((d) => {
            const picked = designIds.includes(d.id);
            return (
              <button
                key={d.id}
                onClick={() => toggleDesign(d.id)}
                className={`text-left rounded border p-3 text-xs space-y-1 ${
                  picked ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
              >
                <div className="flex justify-between">
                  <a
                    href={d.refUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="underline truncate max-w-[24ch]"
                  >
                    {d.refUrl}
                  </a>
                  <span>{picked ? '✅' : '＋'}</span>
                </div>
                <ul className="list-disc pl-4">
                  {(d.observations ?? []).slice(0, 3).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
                {d.appliedInTask && (
                  <div className="text-muted-foreground">applied: {d.appliedInTask}</div>
                )}
              </button>
            );
          })}
          {row.designRefs.length === 0 && (
            <div className="text-xs text-muted-foreground">Нет записей за эту неделю.</div>
          )}
        </div>
      </section>

      <PickOne
        title="Business notes · выбери одну"
        items={row.businessNotes.map((b) => ({
          id: b.id,
          title: b.clientPain || b.sourceUrl,
          subtitle: `${b.sourceType} · ${b.fiveInsights?.length ?? 0} insights`,
        }))}
        value={businessId}
        onChange={setBusinessId}
      />
      <PickOne
        title="Learning · выбери одну"
        items={row.learningNotes.map((l) => ({
          id: l.id,
          title: l.topic,
          subtitle: l.applicationText,
        }))}
        value={learningId}
        onChange={setLearningId}
      />
      <PickOne
        title="Explain · выбери одну"
        items={row.explainNotes.map((e) => ({
          id: e.id,
          title: e.simpleVersion?.slice(0, 80) ?? '',
          subtitle: e.metaphor,
        }))}
        value={explainId}
        onChange={setExplainId}
      />

      <section className="space-y-3">
        <Field label="Improvement applied" value={improvement} onChange={setImprovement} />
        <Field label="Task example" value={taskExample} onChange={setTaskExample} />
        <Field label="Manager notes" value={managerNotes} onChange={setManagerNotes} textarea />
      </section>

      <div className="flex gap-2">
        <button
          onClick={() => save.mutate(false)}
          disabled={save.isPending}
          className="rounded border px-3 py-2 text-sm"
        >
          {save.isPending ? 'Saving…' : 'Save draft'}
        </button>
        <button
          onClick={() => save.mutate(true)}
          disabled={save.isPending}
          className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm"
        >
          Mark reviewed → sync to Notion
        </button>
      </div>
    </div>
  );
}

function PickOne({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: { id: number; title: string; subtitle: string }[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  return (
    <section>
      <h3 className="font-medium text-sm mb-2">{title}</h3>
      <div className="space-y-1">
        {items.map((it) => {
          const picked = value === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(picked ? null : it.id)}
              className={`block w-full text-left rounded border p-2 text-xs ${
                picked ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
            >
              <div className="flex justify-between">
                <span className="font-medium truncate">{it.title || '(без заголовка)'}</span>
                <span>{picked ? '✅' : '＋'}</span>
              </div>
              {it.subtitle && (
                <div className="text-muted-foreground truncate">{it.subtitle}</div>
              )}
            </button>
          );
        })}
        {items.length === 0 && <div className="text-xs text-muted-foreground">Нет записей.</div>}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border bg-background px-3 py-2 text-sm min-h-[80px]"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border bg-background px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
