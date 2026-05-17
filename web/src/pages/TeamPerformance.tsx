// Performance Dashboard — team overview with bonus tracking and risk status
// CACHE_BUSTER_QWXPLNZ_2026_05_17_01
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, DollarSign, Award, Target } from 'lucide-react';
import { usePeriod, type PeriodPreset } from '../hooks/usePeriod';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  todayPercent: number;
  periodPercent: number;
  monthlyScore: number;
  bonusTier: string;
  bonusEarnedUzs: number;
  predictedBonusUzs: number;
  riskStatus: 'on_track' | 'warning' | 'weak' | 'critical';
  missedCount: number;
  lateCount: number;
  trend: 'up' | 'down' | 'flat';
}

const MOCK_TEAM: TeamMember[] = [
  { id: 1, name: 'Алишер Каримов', role: 'UX Designer', avatar: 'АК',
    todayPercent: 85, periodPercent: 88, monthlyScore: 84,
    bonusTier: '70%', bonusEarnedUzs: 381818, predictedBonusUzs: 700000,
    riskStatus: 'on_track', missedCount: 2, lateCount: 1, trend: 'up' },
  { id: 2, name: 'Малика Юсупова', role: 'Frontend Dev', avatar: 'МЮ',
    todayPercent: 60, periodPercent: 72, monthlyScore: 68,
    bonusTier: '40%', bonusEarnedUzs: 218182, predictedBonusUzs: 400000,
    riskStatus: 'weak', missedCount: 7, lateCount: 3, trend: 'down' },
  { id: 3, name: 'Бобур Рахимов', role: 'Product Manager', avatar: 'БР',
    todayPercent: 100, periodPercent: 95, monthlyScore: 93,
    bonusTier: '100%', bonusEarnedUzs: 545455, predictedBonusUzs: 1000000,
    riskStatus: 'on_track', missedCount: 0, lateCount: 0, trend: 'up' },
  { id: 4, name: 'Зарина Ахмедова', role: 'Business Analyst', avatar: 'ЗА',
    todayPercent: 40, periodPercent: 55, monthlyScore: 52,
    bonusTier: '0%', bonusEarnedUzs: 0, predictedBonusUzs: 0,
    riskStatus: 'critical', missedCount: 12, lateCount: 5, trend: 'down' },
  { id: 5, name: 'Санжар Тошматов', role: 'UX Researcher', avatar: 'СТ',
    todayPercent: 75, periodPercent: 78, monthlyScore: 76,
    bonusTier: '70%', bonusEarnedUzs: 318182, predictedBonusUzs: 700000,
    riskStatus: 'warning', missedCount: 4, lateCount: 2, trend: 'flat' },
];

const RISK_COLORS: Record<TeamMember['riskStatus'], string> = {
  on_track: 'chip-success',
  warning: 'chip-primary',
  weak: 'chip-warning',
  critical: 'chip-danger',
};

const RISK_LABELS: Record<TeamMember['riskStatus'], string> = {
  on_track: 'On Track',
  warning: 'Warning',
  weak: 'Weak',
  critical: 'Critical',
};

const RISK_SORT: Record<TeamMember['riskStatus'], number> = {
  critical: 0,
  warning: 1,
  weak: 2,
  on_track: 3,
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

  const sorted = [...MOCK_TEAM].sort((a, b) => RISK_SORT[a.riskStatus] - RISK_SORT[b.riskStatus]);

  const avgPerf = Math.round(MOCK_TEAM.reduce((s, m) => s + m.periodPercent, 0) / MOCK_TEAM.length);
  const atRisk = MOCK_TEAM.filter((m) => m.riskStatus === 'critical' || m.riskStatus === 'warning').length;
  const totalMissed = MOCK_TEAM.reduce((s, m) => s + m.missedCount, 0);
  const totalLate = MOCK_TEAM.reduce((s, m) => s + m.lateCount, 0);
  const totalEarned = MOCK_TEAM.reduce((s, m) => s + m.bonusEarnedUzs, 0);
  const totalPredicted = MOCK_TEAM.reduce((s, m) => s + m.predictedBonusUzs, 0);
  const best = MOCK_TEAM.reduce((a, b) => (a.periodPercent > b.periodPercent ? a : b));
  const onTrackCount = MOCK_TEAM.filter((m) => m.riskStatus === 'on_track').length;

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
          value={best.name.split(' ')[0] ?? best.name}
          sub={`${best.periodPercent}%`}
          icon={<Award className="h-4 w-4 text-primary" />}
          tint="bg-primary-soft"
        />
        <MetricCard
          label="On Track"
          value={`${onTrackCount} / ${MOCK_TEAM.length}`}
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
                key={m.id}
                onClick={() => navigate(`/performance/${m.id}`)}
                className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition cursor-pointer"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary-soft text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {m.avatar}
                    </div>
                    <div>
                      <div className="font-medium">{m.name}</div>
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
                  <span className={RISK_COLORS[m.riskStatus]}>{RISK_LABELS[m.riskStatus]}</span>
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
