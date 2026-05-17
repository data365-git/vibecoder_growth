// Performance Dashboard — team overview with bonus tracking and risk status
// CACHE_BUSTER_QWXPLNZ_2026_05_17_02
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, DollarSign, Award, Target } from 'lucide-react';
import { usePeriod, type PeriodPreset } from '../hooks/usePeriod';
import { api } from '../api/client';

interface TeamRow {
  vibecoderId: number;
  fullNameRu: string;
  role: string;
  avatar: string;
  todayPercent: number;
  periodPercent: number;
  monthlyScore: number;
  bonusTier: string;
  bonusEarnedUzs: number;
  predictedBonusUzs: number;
  riskStatus: string;
  missedCount: number;
  lateCount: number;
  trend: 'up' | 'down' | 'flat';
}

const RISK_COLORS: Record<string, string> = {
  on_track: 'chip-success',
  warning: 'chip-primary',
  weak: 'chip-warning',
  critical: 'chip-danger',
  pending: 'chip-primary',
};

const RISK_LABELS: Record<string, string> = {
  on_track: 'On Track',
  warning: 'Warning',
  weak: 'Weak',
  critical: 'Critical',
  pending: 'Pending',
};

const RISK_SORT: Record<string, number> = {
  critical: 0,
  warning: 1,
  weak: 2,
  on_track: 3,
  pending: 4,
};

const TIER_CHIP: Record<string, string> = {
  '100%': 'chip-success',
  '70%': 'chip-primary',
  '40%': 'chip-warning',
  '0%': 'chip-danger',
};

function percentColor(v: number): string {
  if (v >= 90) return 'text-success font-semibold';
  if (v >= 75) return 'text-warning font-semibold';
  if (v >= 60) return 'text-orange-500 font-semibold';
  return 'text-danger font-semibold';
}

function fmtUzs(v: number): string {
  return v.toLocaleString('ru-RU') + ' UZS';
}

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This week' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'custom', label: 'Custom' },
];

export default function TeamPerformance() {
  const navigate = useNavigate();
  const { preset, setPreset, setCustom, period } = usePeriod('this_month');

  const { data, isLoading, isError } = useQuery<{ rows: TeamRow[] }>({
    queryKey: ['dashboard', 'team'],
    queryFn: () => api('/dashboard/team'),
  });

  const team = data?.rows ?? [];

  const sorted = [...team].sort((a, b) => (RISK_SORT[a.riskStatus] ?? 99) - (RISK_SORT[b.riskStatus] ?? 99));

  const avgPerf = team.length > 0 ? Math.round(team.reduce((s, m) => s + m.periodPercent, 0) / team.length) : 0;
  const atRisk = team.filter((m) => m.riskStatus === 'critical' || m.riskStatus === 'warning').length;
  const totalMissed = team.reduce((s, m) => s + m.missedCount, 0);
  const totalLate = team.reduce((s, m) => s + m.lateCount, 0);
  const totalEarned = team.reduce((s, m) => s + m.bonusEarnedUzs, 0);
  const totalPredicted = team.reduce((s, m) => s + m.predictedBonusUzs, 0);
  const best = team.length > 0 ? team.reduce((a, b) => (a.periodPercent > b.periodPercent ? a : b)) : null;
  const onTrackCount = team.filter((m) => m.riskStatus === 'on_track').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Performance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {period.start} → {period.end}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium border transition ${
                preset === p.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                onChange={(e) => setCustom((prev) => ({ ...prev, start: e.target.value }))}
                className="rounded-xl border border-border/70 bg-card px-3 py-2 text-sm"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <input
                type="date"
                onChange={(e) => setCustom((prev) => ({ ...prev, end: e.target.value }))}
                className="rounded-xl border border-border/70 bg-card px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
        Score computation coming in next release. Showing roster only.
      </div>

      {isLoading && (
        <div className="card-soft p-8 text-center text-muted-foreground">Loading...</div>
      )}

      {isError && (
        <div className="card-soft p-8 text-center text-danger">Failed to load team data.</div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Avg Performance"
              value={`${avgPerf}%`}
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
              tint="bg-primary-soft"
            />
            <MetricCard
              label="Employees at Risk"
              value={String(atRisk)}
              icon={<AlertTriangle className="h-4 w-4 text-danger" />}
              tint="bg-danger-soft"
            />
            <MetricCard
              label="Total Missed Reports"
              value={String(totalMissed)}
              icon={<Minus className="h-4 w-4 text-warning" />}
              tint="bg-warning-soft"
            />
            <MetricCard
              label="Total Late Reports"
              value={String(totalLate)}
              icon={<Minus className="h-4 w-4 text-warning" />}
              tint="bg-warning-soft"
            />
            <MetricCard
              label="Total Bonus Accrued"
              value={fmtUzs(totalEarned)}
              icon={<DollarSign className="h-4 w-4 text-success" />}
              tint="bg-success-soft"
              small
            />
            <MetricCard
              label="Predicted Total Payout"
              value={fmtUzs(totalPredicted)}
              icon={<DollarSign className="h-4 w-4 text-success" />}
              tint="bg-success-soft"
              small
            />
            <MetricCard
              label="Best Performer"
              value={best ? (best.fullNameRu.split(' ')[0] ?? best.fullNameRu) : '—'}
              sub={best ? `${best.periodPercent}%` : undefined}
              icon={<Award className="h-4 w-4 text-primary" />}
              tint="bg-primary-soft"
            />
            <MetricCard
              label="On Track"
              value={`${onTrackCount} / ${team.length}`}
              icon={<Target className="h-4 w-4 text-success" />}
              tint="bg-success-soft"
            />
          </div>

          <div className="card-soft overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40 bg-muted/30">
                  <th className="text-left font-medium px-5 py-2.5">Employee</th>
                  <th className="text-right font-medium px-2 py-2.5">Today %</th>
                  <th className="text-right font-medium px-2 py-2.5">Period %</th>
                  <th className="text-right font-medium px-2 py-2.5">Score</th>
                  <th className="text-left font-medium px-2 py-2.5">Tier</th>
                  <th className="text-right font-medium px-2 py-2.5">Earned</th>
                  <th className="text-right font-medium px-2 py-2.5">Predicted</th>
                  <th className="text-left font-medium px-2 py-2.5">Status</th>
                  <th className="text-right font-medium px-2 py-2.5">Missed</th>
                  <th className="text-right font-medium px-2 py-2.5">Late</th>
                  <th className="text-center font-medium px-2 py-2.5">Trend</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr
                    key={m.vibecoderId}
                    onClick={() => navigate(`/performance/${m.vibecoderId}`)}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-soft text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {m.avatar}
                        </div>
                        <div>
                          <div className="font-medium">{m.fullNameRu}</div>
                          <div className="text-xs text-muted-foreground">{m.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-2 py-3 text-right tabular-nums ${percentColor(m.todayPercent)}`}>{m.todayPercent}%</td>
                    <td className={`px-2 py-3 text-right tabular-nums ${percentColor(m.periodPercent)}`}>{m.periodPercent}%</td>
                    <td className="px-2 py-3 text-right tabular-nums font-semibold">{m.monthlyScore}</td>
                    <td className="px-2 py-3">
                      <span className={TIER_CHIP[m.bonusTier] ?? 'chip'}>{m.bonusTier}</span>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">{m.bonusEarnedUzs.toLocaleString()}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">{m.predictedBonusUzs.toLocaleString()}</td>
                    <td className="px-2 py-3">
                      <span className={RISK_COLORS[m.riskStatus] ?? 'chip'}>{RISK_LABELS[m.riskStatus] ?? m.riskStatus}</span>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-danger">{m.missedCount}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-warning">{m.lateCount}</td>
                    <td className="px-2 py-3 text-center">
                      {m.trend === 'up' && <TrendingUp className="h-4 w-4 text-success inline" />}
                      {m.trend === 'down' && <TrendingDown className="h-4 w-4 text-danger inline" />}
                      {m.trend === 'flat' && <Minus className="h-4 w-4 text-muted-foreground inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label, value, sub, icon, tint, small,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tint: string;
  small?: boolean;
}) {
  return (
    <div className="card-soft p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-xl ${tint} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="leading-tight min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className={`font-bold tracking-tight tabular-nums ${small ? 'text-base' : 'text-xl'}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
