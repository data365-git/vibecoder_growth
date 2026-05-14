import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  SlidersHorizontal,
  Plus,
  MoreVertical,
  Target,
  Trophy,
  Users,
  AlertTriangle,
  Gift,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
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
  completed: string | null;
  inProgress: string | null;
  blockers: string | null;
  plansTomorrow: string;
}
interface Vibecoder {
  id: number;
  fullNameRu: string;
  tgUsername: string | null;
  active: boolean;
}
interface ScoreRow {
  vibecoderId: number;
  fullNameRu: string;
  existing: { total: number } | null;
  auto: { total: number };
}
interface ScoresResp {
  yearMonth: string;
  rows: ScoreRow[];
}

function shiftDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return dt.toISOString().slice(0, 10);
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export default function DailyOverview() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');

  const allReports = useQuery({
    queryKey: ['reports', 'all'],
    queryFn: () => api<Report[]>(`/reports`),
  });
  const team = useQuery({ queryKey: ['vibecoders'], queryFn: () => api<Vibecoder[]>('/vibecoders') });
  const ym = date.slice(0, 7);
  const scores = useQuery({
    queryKey: ['scores', ym],
    queryFn: () => api<ScoresResp>(`/scores/${ym}`),
  });

  const data = useMemo(() => {
    const reports = allReports.data ?? [];
    const teamRows = team.data ?? [];
    const yesterday = shiftDays(date, -1);

    const byDate = new Map<string, Report[]>();
    for (const r of reports) {
      if (!byDate.has(r.reportDate)) byDate.set(r.reportDate, []);
      byDate.get(r.reportDate)!.push(r);
    }
    const todayRows = byDate.get(date) ?? [];
    const yRows = byDate.get(yesterday) ?? [];

    const submitted = (rs: Report[]) => rs.filter((r) => r.didToday).length;
    const completed = (rs: Report[]) => rs.filter((r) => r.keptPromise === true).length;
    const pending = (rs: Report[]) => rs.filter((r) => r.didToday && r.keptPromise == null).length;
    const missed = (rs: Report[]) => rs.filter((r) => r.status === 'missed').length;
    const onTrack = (rs: Report[]) => rs.filter((r) => r.status === 'on_time').length;
    const atRisk = (rs: Report[]) => rs.filter((r) => r.status === 'late').length;

    const trendDays: { date: string; reports: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = shiftDays(date, -i);
      trendDays.push({ date: d, reports: submitted(byDate.get(d) ?? []) });
    }

    return {
      today: todayRows,
      yesterday: yRows,
      byVc: new Map(todayRows.map((r) => [r.vibecoderId, r] as const)),
      activeTeam: teamRows.filter((v) => v.active),
      kpis: {
        reports: { value: submitted(todayRows), prev: submitted(yRows) },
        completedPromises: { value: completed(todayRows), prev: completed(yRows) },
        pendingPromises: { value: pending(todayRows), prev: pending(yRows) },
        missed: { value: missed(todayRows), prev: missed(yRows) },
      },
      counts: {
        total: teamRows.filter((v) => v.active).length,
        reportedToday: submitted(todayRows),
        onTrack: onTrack(todayRows),
        atRisk: atRisk(todayRows),
        missed: missed(todayRows),
      },
      trend: trendDays,
    };
  }, [allReports.data, team.data, date]);

  const topPerformers = useMemo(() => {
    const rows = scores.data?.rows ?? [];
    return [...rows]
      .sort((a, b) => (b.existing?.total ?? b.auto.total) - (a.existing?.total ?? a.auto.total))
      .slice(0, 3);
  }, [scores.data]);

  const visibleTeam = data.activeTeam.filter((v) =>
    v.fullNameRu.toLowerCase().includes(search.toLowerCase()),
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">
            {greeting}, Vibecoder! <span className="inline-block">👋</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening with your growth today.
          </p>
        </div>
        <DatePicker value={date} onChange={setDate} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's reports"
          value={data.kpis.reports.value}
          prev={data.kpis.reports.prev}
          icon={<FileText className="h-5 w-5 text-primary" />}
          tint="bg-primary-soft"
        />
        <KpiCard
          label="Completed promises"
          value={data.kpis.completedPromises.value}
          prev={data.kpis.completedPromises.prev}
          icon={<CheckCircle2 className="h-5 w-5 text-success" />}
          tint="bg-success-soft"
        />
        <KpiCard
          label="Pending promises"
          value={data.kpis.pendingPromises.value}
          prev={data.kpis.pendingPromises.prev}
          icon={<Clock className="h-5 w-5 text-warning" />}
          tint="bg-warning-soft"
        />
        <KpiCard
          label="Missed reports"
          value={data.kpis.missed.value}
          prev={data.kpis.missed.prev}
          invertDelta
          icon={<XCircle className="h-5 w-5 text-danger" />}
          tint="bg-danger-soft"
        />
      </div>

      {/* Overview + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-soft p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-[15px]">Daily overview</h2>
            <p className="text-xs text-muted-foreground">Summary of today's activity</p>
          </div>
          <ul className="space-y-3 text-sm">
            <OverviewRow icon={<Users className="h-4 w-4" />} tint="bg-primary-soft text-primary" label="Total vibecoders" value={data.counts.total} />
            <OverviewRow icon={<CheckCircle2 className="h-4 w-4" />} tint="bg-success-soft text-success" label="Reported today" value={data.counts.reportedToday} />
            <OverviewRow icon={<AlertTriangle className="h-4 w-4" />} tint="bg-warning-soft text-warning" label="On track" value={data.counts.onTrack} />
            <OverviewRow icon={<XCircle className="h-4 w-4" />} tint="bg-danger-soft text-danger" label="At risk" value={data.counts.atRisk} />
            <OverviewRow icon={<XCircle className="h-4 w-4" />} tint="bg-danger-soft text-danger" label="Missed" value={data.counts.missed} />
          </ul>
        </div>

        <div className="card-soft p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-semibold text-[15px]">Reports trend</h2>
              <p className="text-xs text-muted-foreground">Daily reports over time</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/70 rounded-lg px-3 py-1.5">
              7 Days <span className="text-foreground">▾</span>
            </div>
          </div>
          <div className="h-[260px] -ml-2">
            <TrendChart data={data.trend} />
          </div>
        </div>
      </div>

      {/* Reports table + Right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card-soft lg:col-span-3 overflow-hidden">
          <div className="p-5 pb-3 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h2 className="font-semibold text-[15px]">Today's reports</h2>
              <p className="text-xs text-muted-foreground">All vibecoder daily updates</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vibecoder…"
                  className="rounded-lg border border-border/70 bg-card pl-9 pr-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </div>
              <button className="h-9 w-9 rounded-lg border border-border/70 flex items-center justify-center text-muted-foreground hover:bg-muted">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white px-3.5 py-2 text-sm font-medium hover:bg-primary/90 shadow-sm">
                <Plus className="h-4 w-4" /> Add report
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-y border-border/60 bg-muted/40">
                <th className="text-left font-medium px-5 py-2.5">Vibecoder</th>
                <th className="text-left font-medium px-2 py-2.5">Status</th>
                <th className="text-left font-medium px-2 py-2.5">Proof</th>
                <th className="text-left font-medium px-2 py-2.5">Promise</th>
                <th className="text-left font-medium px-2 py-2.5">Updated at</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {visibleTeam.map((vc) => {
                const r = data.byVc.get(vc.id);
                const status: ReportStatus = !r || !r.didToday ? 'pending' : r.status;
                return (
                  <tr key={vc.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={vc.fullNameRu} id={vc.id} />
                        <span className="font-medium">{vc.fullNameRu}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3"><StatusPill status={status} /></td>
                    <td className="px-2 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {r?.proofLinks?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Gift className="h-4 w-4" />
                        {r?.keptPromise == null ? 0 : r.keptPromise ? 1 : 0}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">{formatTime(r?.submittedAt ?? null)}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted inline-flex items-center justify-center">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visibleTeam.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No vibecoders match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="p-3 text-center">
            <button className="text-sm font-medium text-primary hover:text-primary/80 inline-flex items-center gap-1">
              View all reports <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-soft p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-[15px]">Focus today</h2>
            </div>
            <ul className="space-y-3 text-sm">
              <FocusItem icon={<Calendar className="h-4 w-4" />} title="Stand-up meeting" time="11:00 AM" />
              <FocusItem icon={<FileText className="h-4 w-4" />} title="Weekly review prep" time="02:00 PM" />
              <FocusItem icon={<Users className="h-4 w-4" />} title="1:1 with team" time="04:30 PM" />
            </ul>
          </div>

          <div className="card-soft p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-warning" />
              <h2 className="font-semibold text-[15px]">Top performers</h2>
            </div>
            <ul className="space-y-2.5 text-sm">
              {topPerformers.length === 0 && <li className="text-xs text-muted-foreground">No scored data yet.</li>}
              {topPerformers.map((p, i) => (
                <li key={p.vibecoderId} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <Avatar name={p.fullNameRu} id={p.vibecoderId} size="sm" />
                    <span className="font-medium truncate">{p.fullNameRu.split(' ')[0]}</span>
                  </div>
                  <span className="text-primary font-semibold">{p.existing?.total ?? p.auto.total}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="card-soft inline-flex items-center gap-2.5 px-3.5 py-2.5 text-sm cursor-pointer hover:bg-muted/30 transition">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{formatDate(value)}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
      <span className="text-muted-foreground text-xs">▾</span>
    </label>
  );
}

function KpiCard({
  label,
  value,
  prev,
  icon,
  tint,
  invertDelta = false,
}: {
  label: string;
  value: number;
  prev: number;
  icon: React.ReactNode;
  tint: string;
  invertDelta?: boolean;
}) {
  const diff = value - prev;
  const pct = prev === 0 ? (value === 0 ? 0 : 100) : Math.round(((value - prev) / Math.max(prev, 1)) * 100);
  const direction = diff === 0 ? 'flat' : diff > 0 ? 'up' : 'down';
  const goodDirection = invertDelta ? 'down' : 'up';
  const tone =
    direction === 'flat'
      ? 'text-muted-foreground'
      : direction === goodDirection
      ? 'text-success'
      : 'text-danger';
  const Arrow = direction === 'flat' ? Minus : direction === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="card-soft p-5">
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-2xl ${tint} flex items-center justify-center shrink-0`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-[28px] leading-tight font-bold tracking-tight mt-1">{value}</p>
        </div>
      </div>
      <div className={`mt-2 inline-flex items-center gap-1 text-xs ${tone}`}>
        <Arrow className="h-3.5 w-3.5" />
        <span className="font-medium">{Math.abs(pct)}%</span>
        <span className="text-muted-foreground">vs yesterday</span>
      </div>
    </div>
  );
}

function OverviewRow({
  icon,
  tint,
  label,
  value,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: number;
}) {
  return (
    <li className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-7 w-7 rounded-full ${tint} flex items-center justify-center`}>{icon}</div>
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function FocusItem({ icon, title, time }: { icon: React.ReactNode; title: string; time: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{time}</div>
      </div>
    </li>
  );
}

function TrendChart({ data }: { data: { date: string; reports: number }[] }) {
  const display = data.map((d) => {
    const [, m, day] = d.date.split('-').map(Number);
    const monthName = new Date(2000, (m ?? 1) - 1, 1).toLocaleString('en', { month: 'short' });
    return { ...d, label: `${day} ${monthName}` };
  });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={display} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" vertical={false} strokeDasharray="3 4" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          padding={{ left: 16, right: 16 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          width={32}
        />
        <Tooltip
          cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '2 4' }}
          content={(props) => {
            if (!props.active || !props.payload?.[0]) return null;
            const p = props.payload[0].payload as { date: string; reports: number };
            const [y, m, d] = p.date.split('-').map(Number);
            const dt = new Date(Date.UTC(y!, m! - 1, d!));
            const label = `${dt.getUTCDate()} ${dt.toLocaleString('en', { month: 'long' })} ${dt.getUTCFullYear()}`;
            return (
              <div className="rounded-xl bg-foreground text-background px-3 py-2 text-xs shadow-elevated">
                <div className="font-semibold">{label}</div>
                <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {p.reports} Reports
                </div>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="reports"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          fill="url(#trendFill)"
          dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
          activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
