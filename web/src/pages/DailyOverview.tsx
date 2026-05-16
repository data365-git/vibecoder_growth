import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Clock, XCircle, FileText, Gift, Search } from 'lucide-react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';
import { StatusPill, type ReportStatus } from '../components/StatusPill';

interface Report {
  id: number;
  vibecoderId: number;
  reportDate: string;
  status: ReportStatus;
  didToday: string;
  submittedAt: string | null;
  hasProof: boolean;
  keptPromise: boolean | null;
  proofLinks: string[];
  blockers: string | null;
}
interface Vibecoder {
  id: number;
  fullNameRu: string;
  tgUsername: string | null;
  active: boolean;
}
interface Standup {
  id: number;
  vibecoderId: number;
  standupDate: string;
}

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(11, 16);
}

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

// Minimalistic daily overview. One date, one table — every row is one
// active vibecoder and shows whether they did stand-up, what their report
// status is, proof count, promise outcome, and current blocker if any.
// No charts, no vanity KPIs.
export default function DailyOverview() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');

  const team = useQuery({ queryKey: ['vibecoders'], queryFn: () => api<Vibecoder[]>('/vibecoders') });
  const reports = useQuery({
    queryKey: ['reports', 'all'],
    queryFn: () => api<Report[]>(`/reports`),
  });
  const standups = useQuery({
    queryKey: ['standup', date],
    queryFn: () => api<Standup[]>(`/reports/standup/today?date=${date}`),
  });

  const view = useMemo(() => {
    const teamRows = (team.data ?? []).filter((v) => v.active);
    const reportsToday = (reports.data ?? []).filter((r) => r.reportDate === date);
    const standupsToday = standups.data ?? [];
    const reportByVc = new Map(reportsToday.map((r) => [r.vibecoderId, r] as const));
    const standupByVc = new Set(standupsToday.map((s) => s.vibecoderId));

    let onTime = 0, late = 0, missed = 0, pending = 0;
    const rows = teamRows.map((vc) => {
      const r = reportByVc.get(vc.id);
      const standupDone = standupByVc.has(vc.id);
      let status: ReportStatus = 'pending';
      if (r && r.submittedAt) {
        status = r.status;
        if (status === 'on_time') onTime++;
        else if (status === 'late') late++;
        else missed++;
      } else {
        pending++;
      }
      return { vc, report: r, standupDone, status };
    });

    // Sort: missed first, then late, then pending, then on-time. The
    // manager wants to see who needs attention at the top.
    const order: Record<ReportStatus, number> = {
      missed: 0,
      late: 1,
      pending: 2,
      on_time: 3,
    } as Record<ReportStatus, number>;
    rows.sort((a, b) => order[a.status] - order[b.status] || a.vc.fullNameRu.localeCompare(b.vc.fullNameRu));

    return { rows, counts: { total: teamRows.length, onTime, late, missed, pending } };
  }, [team.data, reports.data, standups.data, date]);

  const visible = view.rows.filter((r) =>
    r.vc.fullNameRu.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Daily</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Состояние каждого vibecoder за день. Кто наверху — тому нужно внимание.
          </p>
        </div>
        <DatePicker value={date} onChange={setDate} />
      </div>

      {/* Single count strip — no deltas, no comparisons, just today's reality. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Counter label="On-time" value={view.counts.onTime} icon={<CheckCircle2 className="h-4 w-4 text-success" />} tint="bg-success-soft" />
        <Counter label="Late" value={view.counts.late} icon={<Clock className="h-4 w-4 text-warning" />} tint="bg-warning-soft" />
        <Counter label="Missed" value={view.counts.missed} icon={<XCircle className="h-4 w-4 text-danger" />} tint="bg-danger-soft" />
        <Counter label="Pending" value={view.counts.pending} icon={<Clock className="h-4 w-4 text-muted-foreground" />} tint="bg-muted" />
      </div>

      <div className="card-soft overflow-hidden overflow-x-auto">
        <div className="p-4 flex items-center justify-between gap-3 border-b border-border/40">
          <div className="text-sm text-muted-foreground">
            {view.counts.total} активных · {formatDate(date)}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск…"
              aria-label="Поиск по команде"
              className="rounded-lg border border-border/70 bg-card pl-9 pr-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border/40 bg-muted/30">
              <th className="text-left font-medium px-5 py-2.5">Vibecoder</th>
              <th className="text-left font-medium px-2 py-2.5">Stand-up</th>
              <th className="text-left font-medium px-2 py-2.5">Report</th>
              <th className="text-left font-medium px-2 py-2.5">Proof</th>
              <th className="text-left font-medium px-2 py-2.5">Promise</th>
              <th className="text-left font-medium px-2 py-2.5">Submitted</th>
              <th className="text-left font-medium px-2 py-2.5">Blocker</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ vc, report, standupDone, status }) => (
              <tr key={vc.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={vc.fullNameRu} id={vc.id} />
                    <span className="font-medium">{vc.fullNameRu}</span>
                  </div>
                </td>
                <td className="px-2 py-3">
                  {standupDone ? (
                    <span title="Stand-up сдан" aria-label="Stand-up сдан">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </span>
                  ) : (
                    <span title="Stand-up не сдан" aria-label="Stand-up не сдан">
                      <XCircle className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                  )}
                </td>
                <td className="px-2 py-3"><StatusPill status={status} /></td>
                <td className="px-2 py-3">
                  <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
                    <FileText className="h-4 w-4" />
                    {report?.proofLinks?.length ?? 0}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs ${
                      report?.keptPromise === true
                        ? 'text-success'
                        : report?.keptPromise === false
                        ? 'text-danger'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <Gift className="h-4 w-4" />
                    {report?.keptPromise === true ? 'kept' : report?.keptPromise === false ? 'broken' : '—'}
                  </span>
                </td>
                <td className="px-2 py-3 text-muted-foreground tabular-nums">{formatTime(report?.submittedAt ?? null)}</td>
                <td className="px-2 py-3 text-muted-foreground max-w-[260px] truncate" title={report?.blockers ?? ''}>
                  {report?.blockers && report.blockers.toLowerCase() !== 'нет' ? report.blockers : '—'}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Никого не нашёл.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    // Chrome/Edge require an explicit showPicker() call to open the native
    // date dropdown reliably; the older trick of wrapping a `sr-only` input
    // in a <label> didn't work everywhere. Fall back to focus() for browsers
    // that don't support showPicker yet.
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
        // Positioned over the button but invisible — keeps the picker
        // anchored under the visible chip and lets the browser handle keyboard / touch.
        className="absolute inset-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </button>
  );
}

function Counter({ label, value, icon, tint }: { label: string; value: number; icon: React.ReactNode; tint: string }) {
  return (
    <div className="card-soft p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-xl ${tint} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="leading-tight">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tracking-tight tabular-nums">{value}</div>
      </div>
    </div>
  );
}
