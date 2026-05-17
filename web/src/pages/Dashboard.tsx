import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ClipboardList,
  Lightbulb,
  Lock,
  MessageCircle,
  Plus,
  Target,
  TrendingUp,
  Trash2,
  Wand2,
} from 'lucide-react';
import { api, clearToken } from '../api/client';
import { Avatar } from '../components/Avatar';
import { Input } from '../components/Input';
import {
  VibecoderEditDialog,
  BLANK_VIBECODER,
  type VibecoderDraft,
} from '../components/VibecoderEditDialog';

type Pillar =
  | 'discipline_reporting'
  | 'uxui_taste'
  | 'business_thinking'
  | 'professional_learning'
  | 'simple_explanation'
  | 'deadline_ownership';

interface DashboardEmployee {
  vibecoderId: number;
  fullNameRu: string;
  tgUsername: string | null;
  role: string;
  baseSalaryUzs: number;
  bonusBaselineUzs: number;
  timezone: string;
  active: boolean;
  monthlyDone: number;
  monthlyRate: number;
  bonusEarnedUzs: number;
  bonusPredictedUzs: number;
  perPillar: Record<Pillar, { done: number; target: number }>;
}

interface DashboardResponse {
  date: string;
  yearMonth: string;
  workingDaysInMonth: number;
  workingDaysElapsed: number;
  todayCompletion: { done: number; total: number; percent: number };
  employees: DashboardEmployee[];
}

type CellStatus = 'done' | 'not_done' | 'not_set';

interface HabitMark {
  vibecoderId: number;
  markDate: string;
  pillar: Pillar;
  status: 'done' | 'not_done';
  note: string | null;
}

interface Report {
  id: number;
  vibecoderId: number;
  reportDate: string;
  status: 'on_time' | 'late' | 'missed' | 'pending';
  submittedAt: string | null;
}

interface BotStatus {
  botMode: 'webhook' | 'polling' | 'off';
  groupConfigured: boolean;
  timezone: string;
  version: string;
}

interface WipeResult {
  ok: boolean;
  mode: 'today' | 'week';
  start: string;
  end: string;
  counts: Record<string, number>;
}

const PILLAR_ORDER: Array<{ key: Pillar; label: string; target: number; Icon: typeof ClipboardList; color: string }> = [
  { key: 'discipline_reporting', label: 'Discipline & Reporting', target: 10, Icon: ClipboardList, color: 'text-blue-500' },
  { key: 'uxui_taste', label: 'UX/UI Taste', target: 20, Icon: Wand2, color: 'text-blue-400' },
  { key: 'business_thinking', label: 'Business Thinking', target: 20, Icon: Lightbulb, color: 'text-amber-500' },
  { key: 'professional_learning', label: 'Professional Learning', target: 15, Icon: TrendingUp, color: 'text-emerald-500' },
  { key: 'simple_explanation', label: 'Simple Explanation', target: 10, Icon: MessageCircle, color: 'text-sky-500' },
  { key: 'deadline_ownership', label: 'Deadline & Ownership', target: 25, Icon: Target, color: 'text-rose-500' },
];

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function parseYmd(ymd: string): [number, number, number] {
  const parts = ymd.split('-').map(Number);
  return [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
}

function addDays(ymd: string, delta: number): string {
  const [y, m, d] = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function dayLabel(ymd: string): { md: string; dow: string } {
  const [y, m, d] = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const mon = dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const dow = dt.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return { md: `${mon} ${d}`, dow };
}

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<VibecoderDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lastWipe, setLastWipe] = useState<WipeResult | null>(null);

  const qc = useQueryClient();
  const navigate = useNavigate();

  const dashboard = useQuery({
    queryKey: ['dashboard', date],
    queryFn: () => api<DashboardResponse>(`/dashboard?date=${date}`),
  });

  const employees = dashboard.data?.employees ?? [];
  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);

  useEffect(() => {
    const first = activeEmployees[0];
    if (selectedId == null && first) {
      setSelectedId(first.vibecoderId);
    }
  }, [activeEmployees, selectedId]);

  const selected = employees.find((e) => e.vibecoderId === selectedId) ?? null;

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(date, i - 6)), [date]);
  const weekStart = days[0];
  const weekEnd = days[6];

  const habits = useQuery({
    queryKey: ['habits', selectedId, weekStart, weekEnd],
    queryFn: () =>
      api<HabitMark[]>(
        `/habits?vibecoderId=${selectedId}&from=${weekStart}&to=${weekEnd}`,
      ),
    enabled: selectedId != null,
  });

  const reports = useQuery({
    queryKey: ['reports', 'all'],
    queryFn: () => api<Report[]>('/reports'),
  });

  const mark = useMutation({
    mutationFn: (body: { vibecoderId: number; markDate: string; pillar: Pillar; status: 'done' | 'not_done' | null }) =>
      api('/habits', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits', selectedId] });
      qc.invalidateQueries({ queryKey: ['dashboard', date] });
    },
  });

  const saveVc = useMutation({
    mutationFn: (v: VibecoderDraft) =>
      api<VibecoderDraft>('/vibecoders', { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vibecoders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setEditing(null);
      setEditError(null);
    },
    onError: (e: any) => setEditError(e?.message ?? 'Save failed'),
  });

  const removeVc = useMutation({
    mutationFn: (id: number) => api(`/vibecoders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vibecoders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setConfirmDelete(false);
      setSelectedId(null);
    },
  });

  const botStatus = useQuery({
    queryKey: ['settings', 'status'],
    queryFn: () => api<BotStatus>('/settings/status'),
  });

  const wipe = useMutation({
    mutationFn: (mode: 'today' | 'week') =>
      api<WipeResult>('/settings/wipe-data', { method: 'POST', body: JSON.stringify({ mode }) }),
    onSuccess: (data) => {
      setLastWipe(data);
      qc.invalidateQueries();
    },
  });

  function confirmAndWipe(mode: 'today' | 'week') {
    const label = mode === 'today' ? 'today' : 'this week';
    if (window.confirm(`Wipe all data for ${label}? Roster is preserved. Cannot be undone.`)) {
      wipe.mutate(mode);
    }
  }

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  const habitMap = useMemo(() => {
    const m = new Map<string, HabitMark>();
    (habits.data ?? []).forEach((h) => m.set(`${h.markDate}|${h.pillar}`, h));
    return m;
  }, [habits.data]);

  const reportByDate = useMemo(() => {
    if (!selectedId) return new Map<string, Report>();
    const m = new Map<string, Report>();
    (reports.data ?? [])
      .filter((r) => r.vibecoderId === selectedId)
      .forEach((r) => m.set(r.reportDate, r));
    return m;
  }, [reports.data, selectedId]);

  function cellStatus(pillar: Pillar, day: string): CellStatus {
    if (pillar === 'discipline_reporting') {
      const r = reportByDate.get(day);
      if (!r) return 'not_set';
      if (r.submittedAt && (r.status === 'on_time' || r.status === 'late')) return 'done';
      if (r.status === 'missed') return 'not_done';
      return 'not_set';
    }
    const h = habitMap.get(`${day}|${pillar}`);
    if (!h) return 'not_set';
    return h.status;
  }

  function cycle(current: CellStatus): 'done' | 'not_done' | null {
    // Three-state cycle: not_set → done → not_done → not_set (null clears).
    if (current === 'not_set') return 'done';
    if (current === 'done') return 'not_done';
    return null;
  }

  // KPIs
  const todayCompletion = dashboard.data?.todayCompletion ?? { done: 0, total: 0, percent: 0 };
  const monthlyAgg = useMemo(() => {
    if (activeEmployees.length === 0) return { percent: 0, done: 0, total: 0 };
    const done = activeEmployees.reduce((a, e) => a + e.monthlyDone, 0);
    const total = activeEmployees.length * 100;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { percent, done, total };
  }, [activeEmployees]);
  const bonusEarned = activeEmployees.reduce((a, e) => a + e.bonusEarnedUzs, 0);
  const bonusPredicted = activeEmployees.reduce((a, e) => a + e.bonusPredictedUzs, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track daily habits. Build consistency. Earn performance bonuses.
          </p>
        </div>
        <DatePicker value={date} onChange={setDate} />
      </div>

      {dashboard.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {/* KPI row */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Today's Completion Rate"
              value={`${todayCompletion.percent}%`}
              subtitle={`${todayCompletion.done} / ${todayCompletion.total} completed`}
              percent={todayCompletion.percent}
              tint="emerald"
              icon={<CheckCircle2 className="h-6 w-6" />}
            />
            <KpiCard
              label="Monthly Performance Rate"
              value={`${monthlyAgg.percent}%`}
              subtitle={`${monthlyAgg.done} / ${monthlyAgg.total} completed`}
              percent={monthlyAgg.percent}
              tint="blue"
              icon={<ClipboardList className="h-5 w-5" />}
            />
            <KpiCard
              label="Bonus Earned So Far"
              value={`${bonusEarned.toLocaleString()} UZS`}
              subtitle="Current month"
              percent={null}
              tint="purple"
              icon={<span className="text-lg font-bold">₿</span>}
            />
            <KpiCard
              label="Predicted EOM Bonus"
              value={`${bonusPredicted.toLocaleString()} UZS`}
              subtitle="At current pace"
              percent={null}
              tint="orange"
              icon={<TrendingUp className="h-6 w-6" />}
            />
          </section>

          {/* Employee selector */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">Select employee</h2>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {activeEmployees.map((e) => {
                const isSel = e.vibecoderId === selectedId;
                const ratePct = Math.round(e.monthlyRate * 100);
                return (
                  <button
                    key={e.vibecoderId}
                    type="button"
                    onClick={() => setSelectedId(e.vibecoderId)}
                    className={`relative shrink-0 min-w-[210px] rounded-xl p-3 flex items-center gap-3 text-left transition bg-card ${
                      isSel
                        ? 'border-2 border-primary shadow-sm'
                        : 'border border-border/60 hover:border-border'
                    }`}
                  >
                    {isSel && (
                      <span className="absolute -top-2 -right-2 bg-primary rounded-full p-0.5 border-2 border-card">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                    <Avatar name={e.fullNameRu} id={e.vibecoderId} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{e.fullNameRu}</p>
                        <span className="text-emerald-600 font-semibold text-sm tabular-nums">{ratePct}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{e.monthlyDone} / 100</p>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setEditError(null);
                  setEditing({ ...BLANK_VIBECODER });
                }}
                className="shrink-0 rounded-xl border border-dashed border-border/70 bg-card hover:bg-muted/40 transition px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground"
                aria-label="Add employee"
              >
                <Plus className="h-4 w-4" /> Add employee
              </button>
            </div>
          </section>

          {/* Habit tracker grid */}
          {selected ? (
            <section className="card-soft overflow-hidden">
              <div className="p-5 border-b border-border/60 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-semibold">Daily Habit Tracker · {selected.fullNameRu}</h2>
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                  <LegendItem variant="done" label="Done" />
                  <LegendItem variant="not_done" label="Not Done" />
                  <LegendItem variant="not_set" label="Not Set" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
                    <tr>
                      <th className="px-5 py-3 font-medium w-[22%]">Habit / Category</th>
                      {days.map((d) => {
                        const isToday = d === date;
                        const { md, dow } = dayLabel(d);
                        return (
                          <th
                            key={d}
                            className={`px-2 py-3 font-medium text-center border-l border-border/60 ${
                              isToday ? 'bg-primary-soft text-primary' : ''
                            }`}
                          >
                            {md}
                            <br />
                            <span className="text-[10px] font-normal">{dow}</span>
                          </th>
                        );
                      })}
                      <th className="px-5 py-3 font-medium w-[18%]">Monthly Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {PILLAR_ORDER.map(({ key, label, Icon, color }) => {
                      const stat = selected.perPillar?.[key] ?? { done: 0, target: 0 };
                      const target = stat.target || PILLAR_ORDER.find((p) => p.key === key)!.target;
                      const ratio = target > 0 ? stat.done / target : 0;
                      const barColor = ratio >= 0.8 ? 'bg-emerald-500' : ratio >= 0.5 ? 'bg-orange-500' : 'bg-rose-500';
                      const isReadonly = key === 'discipline_reporting';
                      return (
                        <tr key={key} className="hover:bg-muted/30">
                          <td className="px-5 py-3.5 font-medium">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${color}`} />
                              <span>{label}</span>
                              {isReadonly && <Lock className="h-3 w-3 text-muted-foreground" aria-label="Read-only (auto)" />}
                            </div>
                          </td>
                          {days.map((d) => {
                            const status = cellStatus(key, d);
                            const isToday = d === date;
                            const clickable = !isReadonly;
                            return (
                              <td
                                key={d}
                                className={`text-center border-l border-border/40 ${
                                  isToday ? 'bg-primary-soft/40' : ''
                                } ${clickable ? 'cursor-pointer hover:bg-primary-soft/60' : ''}`}
                                onClick={() => {
                                  if (!clickable || !selectedId) return;
                                  const next = cycle(status);
                                  mark.mutate({
                                    vibecoderId: selectedId,
                                    markDate: d,
                                    pillar: key,
                                    status: next,
                                  });
                                }}
                              >
                                <CellDot status={status} highlight={isToday} />
                              </td>
                            );
                          })}
                          <td className="px-5 py-3.5">
                            <div className="flex justify-between text-xs mb-1 tabular-nums">
                              <span>
                                {stat.done} / {target}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className={`${barColor} h-1.5 rounded-full transition-all`}
                                style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-muted/30 text-center text-xs text-muted-foreground border-t border-border/60">
                Click a cell to mark Done or Not Done. Discipline row is automatic.
              </div>
            </section>
          ) : (
            <div className="card-soft p-8 text-center text-sm text-muted-foreground">
              No active employees yet. Click “Add employee” above.
            </div>
          )}

          {/* Employee detail panel */}
          {selected && (
            <EmployeeDetail
              employee={selected}
              onSave={(v) => saveVc.mutate(v)}
              saving={saveVc.isPending}
              error={editError}
              setError={setEditError}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              onDelete={() => removeVc.mutate(selected.vibecoderId)}
              deleting={removeVc.isPending}
            />
          )}

          {/* Admin strip */}
          <section className="card-soft p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Admin</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Bot status, maintenance, account.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-xs">
                {botStatus.isLoading ? (
                  <div className="text-muted-foreground">Loading…</div>
                ) : botStatus.data ? (
                  <dl className="divide-y divide-border/40">
                    <Row label="Bot mode" value={botStatus.data.botMode === 'webhook' ? 'Webhook' : botStatus.data.botMode === 'polling' ? 'Polling' : 'Off'} />
                    <Row label="Group connected" value={botStatus.data.groupConfigured ? 'Yes' : 'No'} />
                    <Row label="Timezone" value={botStatus.data.timezone} />
                    <Row label="Version" value={botStatus.data.version} />
                  </dl>
                ) : (
                  <div className="text-muted-foreground">Status unavailable.</div>
                )}
              </div>
              <div className="flex flex-col items-start gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={wipe.isPending}
                    onClick={() => confirmAndWipe('today')}
                    className="rounded-lg bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50 border border-rose-200"
                  >
                    {wipe.isPending && wipe.variables === 'today' ? 'Wiping…' : 'Wipe today'}
                  </button>
                  <button
                    type="button"
                    disabled={wipe.isPending}
                    onClick={() => confirmAndWipe('week')}
                    className="rounded-lg bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50 border border-rose-200"
                  >
                    {wipe.isPending && wipe.variables === 'week' ? 'Wiping…' : 'Wipe this week'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                  >
                    Logout
                  </button>
                </div>
                {lastWipe && (
                  <div className="text-[11px] text-muted-foreground">
                    Wiped {lastWipe.start === lastWipe.end ? lastWipe.start : `${lastWipe.start} … ${lastWipe.end}`}:{' '}
                    {Object.entries(lastWipe.counts)
                      .filter(([, n]) => n > 0)
                      .map(([k, n]) => `${k}: ${n}`)
                      .join(' · ') || 'nothing'}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {editing && (
        <VibecoderEditDialog
          value={editing}
          error={editError}
          saving={saveVc.isPending}
          onChange={setEditing}
          onClose={() => {
            setEditing(null);
            setEditError(null);
          }}
          onSave={() => saveVc.mutate(editing)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  percent,
  tint,
  icon,
}: {
  label: string;
  value: string;
  subtitle: string;
  percent: number | null;
  tint: 'emerald' | 'blue' | 'purple' | 'orange';
  icon: React.ReactNode;
}) {
  const ring: Record<typeof tint, string> = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
  };
  const bg: Record<typeof tint, string> = {
    emerald: 'bg-emerald-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };
  const fg: Record<typeof tint, string> = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };
  const dash = percent == null ? null : `${Math.max(0, Math.min(100, percent))}, 100`;
  return (
    <div className="card-soft p-5 flex items-center gap-4">
      <div className="relative w-14 h-14 shrink-0">
        {dash ? (
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-muted"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className={ring[tint]}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeDasharray={dash}
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
        ) : (
          <div className={`w-full h-full rounded-full ${bg[tint]}`} />
        )}
        <div className={`absolute inset-0 flex items-center justify-center ${fg[tint]}`}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1 truncate">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function CellDot({ status, highlight }: { status: CellStatus; highlight: boolean }) {
  if (status === 'done') {
    return (
      <span
        className={`inline-flex w-6 h-6 rounded-full bg-emerald-100 items-center justify-center text-emerald-600 ${
          highlight ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'not_done') {
    return (
      <span
        className={`inline-flex w-6 h-6 rounded-full bg-rose-100 items-center justify-center text-rose-500 ${
          highlight ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
        }`}
      >
        <span className="text-base leading-none">×</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex w-6 h-6 rounded-full bg-muted items-center justify-center ${
        highlight ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
      }`}
    >
      <span className="w-2 h-0.5 bg-muted-foreground/40 rounded" />
    </span>
  );
}

function LegendItem({ variant, label }: { variant: CellStatus; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <CellDot status={variant} highlight={false} />
      {label}
    </span>
  );
}

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof (input as any).showPicker === 'function') (input as any).showPicker();
    else input.focus();
  };
  return (
    <button
      type="button"
      onClick={openPicker}
      className="card-soft inline-flex items-center gap-2.5 px-3.5 py-2.5 text-sm cursor-pointer hover:bg-muted/30 transition relative"
    >
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{formatDate(value)}</span>
      <span className="text-muted-foreground text-xs">▾</span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </button>
  );
}

function EmployeeDetail({
  employee,
  onSave,
  saving,
  error,
  setError,
  confirmDelete,
  setConfirmDelete,
  onDelete,
  deleting,
}: {
  employee: DashboardEmployee;
  onSave: (v: VibecoderDraft) => void;
  saving: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  confirmDelete: boolean;
  setConfirmDelete: (b: boolean) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<VibecoderDraft>(() => ({
    id: employee.vibecoderId,
    tgUsername: employee.tgUsername,
    fullNameRu: employee.fullNameRu,
    role: employee.role,
    baseSalaryUzs: employee.baseSalaryUzs,
    bonusBaselineUzs: employee.bonusBaselineUzs,
    timezone: employee.timezone,
    active: employee.active,
  }));

  // Reset draft whenever a different employee is selected.
  useEffect(() => {
    setDraft({
      id: employee.vibecoderId,
      tgUsername: employee.tgUsername,
      fullNameRu: employee.fullNameRu,
      role: employee.role,
      baseSalaryUzs: employee.baseSalaryUzs,
      bonusBaselineUzs: employee.bonusBaselineUzs,
      timezone: employee.timezone,
      active: employee.active,
    });
    setError(null);
    setConfirmDelete(false);
  }, [employee.vibecoderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof VibecoderDraft>(k: K, v: VibecoderDraft[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <section className="card-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <h2 className="font-semibold">{employee.fullNameRu} · Details</h2>
        <span className="text-muted-foreground text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/60 pt-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave(draft);
            }}
            className="space-y-3"
          >
            <h3 className="text-sm font-semibold">Profile & compensation</h3>
            <Input label="ФИО" value={draft.fullNameRu} onChange={(v) => set('fullNameRu', v)} required />
            <Input
              label="Telegram @username"
              value={draft.tgUsername ?? ''}
              onChange={(v) => set('tgUsername', v.replace(/^@/, ''))}
              required
            />
            <Input label="Role" value={draft.role} onChange={(v) => set('role', v)} />
            <Input
              label="Base salary (UZS)"
              type="number"
              value={String(draft.baseSalaryUzs)}
              onChange={(v) => set('baseSalaryUzs', Number(v) || 0)}
            />
            <Input
              label="Bonus baseline (UZS)"
              type="number"
              value={String(draft.bonusBaselineUzs)}
              onChange={(v) => set('bonusBaselineUzs', Number(v) || 0)}
            />
            <Input label="Timezone" value={draft.timezone} onChange={(v) => set('timezone', v)} />
            <label className="flex items-center gap-2 text-sm pt-1">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              Active
            </label>
            {error && (
              <div className="text-xs text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-danger">Danger zone</h3>
            <p className="text-xs text-muted-foreground">
              Removing an employee deletes their roster entry but keeps historical reports for the manager record.
            </p>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Delete {employee.fullNameRu}?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete employee
              </button>
            )}
            <div className="pt-4 border-t border-border/40 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Monthly rate: {Math.round(employee.monthlyRate * 100)}%</div>
              <div>Bonus earned: {employee.bonusEarnedUzs.toLocaleString()} UZS</div>
              <div>Bonus predicted: {employee.bonusPredictedUzs.toLocaleString()} UZS</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
