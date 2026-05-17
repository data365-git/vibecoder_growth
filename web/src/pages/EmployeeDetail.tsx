import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, ChevronUp, X, CheckCircle2, XCircle, Clock, Circle, Plus } from 'lucide-react';
import { api } from '../api/client';

interface CategoryRow {
  key: string;
  label: string;
  earned: number;
  max: number;
}

interface Adjustment {
  id: number;
  date: string;
  category: string;
  points: number;
  reason: string;
  reviewer: string;
}

interface DayItem {
  key: string;
  label: string;
  status: 'completed' | 'missed' | 'late' | 'not_required';
  weight: number;
  earned: number;
  submittedAt?: string;
}

interface EmployeeData {
  vibecoder: {
    id: number;
    name: string;
    role: string;
    avatar: string;
    bonusBaselineUzs: number;
  };
  period: {
    periodPercent: number;
    monthlyScore: number;
    bonusTier: string;
    workingDaysTotal: number;
    workingDaysPassed: number;
    liveBonusValueUzs: number;
    accruedBonusUzs: number;
    predictedFinalBonusUzs: number;
    predictedFinalScore: number;
    riskStatus: string;
  };
  categoryBreakdown: CategoryRow[];
  nextActions: string[];
  manualAdjustments: Adjustment[];
  calendar: Record<string, number>;
}

interface DayDetail {
  date: string;
  dailyPercent: number;
  activePoints: number;
  completed: number;
  missed: number;
  late: number;
  items: DayItem[];
}

const TODAY = new Date().toISOString().slice(0, 10);

function dayColor(score: number | undefined, dateStr: string): string {
  if (!score || dateStr > TODAY) return dateStr > TODAY ? 'bg-gray-100 text-gray-300' : 'bg-gray-200 text-gray-500';
  if (score === 100) return 'bg-green-500 text-white';
  if (score >= 90) return 'bg-green-400 text-white';
  if (score >= 75) return 'bg-amber-400 text-white';
  if (score >= 60) return 'bg-orange-400 text-white';
  return 'bg-red-400 text-white';
}

function barColor(ratio: number): string {
  if (ratio >= 0.9) return 'bg-success';
  if (ratio >= 0.75) return 'bg-warning';
  if (ratio >= 0.6) return 'bg-orange-400';
  return 'bg-danger';
}

function buildCalendarDays(year: number, month: number): { dateStr: string; day: number; isSunday: boolean }[] {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { dateStr: string; day: number; isSunday: boolean }[] = [];
  for (let i = 0; i < offset; i++) cells.push({ dateStr: '', day: 0, isSunday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const dow = new Date(year, month, d).getDay();
    cells.push({ dateStr, day: d, isSunday: dow === 0 });
  }
  return cells;
}

const now = new Date();
const CALENDAR_DAYS = buildCalendarDays(now.getFullYear(), now.getMonth());
const MONTH_LABEL = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

const CATEGORIES = ['Discipline & Reporting', 'Deadline & Ownership', 'Professional Learning', 'UX/UI Taste', 'Business Thinking', 'Simple Explanation'];

const RISK_LABELS: Record<string, string> = {
  on_track: 'On Track',
  warning: 'Warning',
  weak: 'Weak',
  critical: 'Critical',
  pending: 'Pending',
};

export default function EmployeeDetail() {
  const { vibecoderId } = useParams();
  const navigate = useNavigate();

  const [drawerDay, setDrawerDay] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ category: CATEGORIES[0], points: 0, reason: '', evidence: '' });

  const { data, isLoading, isError } = useQuery<EmployeeData>({
    queryKey: ['dashboard', 'employee', vibecoderId],
    queryFn: () => api(`/dashboard/employee/${vibecoderId}`),
    enabled: !!vibecoderId,
  });

  const { data: dayData } = useQuery<DayDetail>({
    queryKey: ['dashboard', 'employee', vibecoderId, 'day', drawerDay],
    queryFn: () => api(`/dashboard/employee/${vibecoderId}/day/${drawerDay}`),
    enabled: !!drawerDay && !!vibecoderId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/performance')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Back to Performance
        </button>
        <div className="card-soft p-8 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/performance')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Back to Performance
        </button>
        <div className="card-soft p-8 text-center text-muted-foreground">Employee not found.</div>
      </div>
    );
  }

  const emp = data.vibecoder;
  const period = data.period;
  const calendar = data.calendar;

  const riskStatus = period.riskStatus;
  const riskMessage = riskStatus === 'on_track'
    ? `On track — maintain current pace for ${period.workingDaysTotal - period.workingDaysPassed} more working days`
    : riskStatus === 'warning'
    ? `Needs more points to reach 90%`
    : riskStatus === 'pending'
    ? `Score computation coming in next release`
    : `Critical — at current pace bonus tier is 0%`;

  const riskChipClass = riskStatus === 'on_track' ? 'chip-success' : riskStatus === 'warning' ? 'chip-primary' : riskStatus === 'pending' ? 'chip-primary' : 'chip-danger';

  function submitAdjustment() {
    setAdjustModalOpen(false);
    setToastVisible(true);
    setAdjustForm({ category: CATEGORIES[0], points: 0, reason: '', evidence: '' });
    setTimeout(() => setToastVisible(false), 3000);
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/performance')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Performance
      </button>

      <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
        Score computation coming in next release. Showing roster only.
      </div>

      {/* Header strip */}
      <div className="card-soft p-6 space-y-4">
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-14 w-14 rounded-full bg-primary-soft text-primary text-lg font-bold flex items-center justify-center shrink-0">
              {emp.avatar}
            </div>
            <div>
              <h1 className="text-[22px] font-bold leading-tight">{emp.name}</h1>
              <p className="text-sm text-muted-foreground">{emp.role}</p>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <KpiTile label="Period Score" value={`${period.monthlyScore} / 100`} />
            <KpiTile label="Bonus Tier">
              <span className={period.bonusTier === '100%' ? 'chip-success' : period.bonusTier === '70%' ? 'chip-primary' : period.bonusTier === '40%' ? 'chip-warning' : 'chip-danger'}>
                {period.bonusTier}
              </span>
            </KpiTile>
            <KpiTile label="Earned Till Today" value={`${period.accruedBonusUzs.toLocaleString()} UZS`} />
            <KpiTile label="Predicted Final Bonus" value={`${period.predictedFinalBonusUzs.toLocaleString()} UZS`} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <span className={riskChipClass}>{RISK_LABELS[riskStatus] ?? riskStatus}</span>
          <span className="text-sm text-muted-foreground">{riskMessage}</span>
        </div>
      </div>

      {/* Bonus Calculator */}
      <div className="card-soft overflow-hidden">
        <button
          onClick={() => setCalcOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold hover:bg-muted/20 transition"
        >
          <span>Bonus Calculation</span>
          {calcOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {calcOpen && (
          <div className="px-6 pb-6">
            <div className="bg-muted/40 rounded-xl p-4 font-mono text-sm space-y-1 text-foreground">
              <div className="flex justify-between"><span className="text-muted-foreground">Baseline salary:</span><span>{emp.bonusBaselineUzs.toLocaleString()} UZS</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Performance tier:</span><span>{period.bonusTier}</span></div>
              <div className="border-t border-border/60 my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">If month ended today:</span>
                <span>{emp.bonusBaselineUzs.toLocaleString()} × {period.bonusTier} = {period.liveBonusValueUzs.toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Earned until today:</span>
                <span>{period.liveBonusValueUzs.toLocaleString()} × {period.workingDaysPassed} / {period.workingDaysTotal} = {period.accruedBonusUzs.toLocaleString()} UZS</span>
              </div>
              <div className="text-xs text-muted-foreground pl-0">({period.workingDaysPassed} working days passed of {period.workingDaysTotal} total)</div>
              <div className="border-t border-border/60 my-2" />
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Predicted final bonus:</span>
                <span>{period.predictedFinalBonusUzs.toLocaleString()} UZS</span>
              </div>
              <div className="text-xs text-muted-foreground">(based on current pace)</div>
            </div>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <div className="card-soft p-6 space-y-4">
          <h2 className="text-base font-semibold">Category Breakdown</h2>
          <div className="space-y-3">
            {data.categoryBreakdown.map((cat) => {
              const ratio = cat.earned / cat.max;
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground">{cat.label}</span>
                    <span className="tabular-nums text-muted-foreground font-medium">{cat.earned} / {cat.max}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(ratio)} transition-all`}
                      style={{ width: `${(ratio * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance calendar */}
      <div className="card-soft p-6">
        <h2 className="text-base font-semibold mb-4">Performance Calendar — {MONTH_LABEL}</h2>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {CALENDAR_DAYS.map((cell, i) => {
            if (!cell.day) return <div key={i} />;
            const score = calendar[cell.dateStr];
            const isFuture = cell.dateStr > TODAY;
            const colorCls = cell.isSunday ? 'bg-gray-100 text-gray-400' : dayColor(score, cell.dateStr);
            const clickable = !isFuture && !cell.isSunday && score !== undefined;
            return (
              <button
                key={cell.dateStr}
                onClick={() => clickable && setDrawerDay(cell.dateStr)}
                disabled={!clickable}
                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition ${colorCls} ${clickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} ${cell.isSunday ? 'opacity-50' : ''}`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {[
            { cls: 'bg-green-500', label: '100%' },
            { cls: 'bg-green-400', label: '90–99%' },
            { cls: 'bg-amber-400', label: '75–89%' },
            { cls: 'bg-orange-400', label: '60–74%' },
            { cls: 'bg-red-400', label: '<60%' },
            { cls: 'bg-gray-200', label: 'No data' },
            { cls: 'bg-gray-100', label: 'Future' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`h-3 w-3 rounded-sm ${l.cls}`} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* What to do next */}
      {data.nextActions.length > 0 && (
        <div className="card-soft p-6 space-y-3 border-l-4 border-l-success">
          <h2 className="text-base font-semibold">What to Do Next</h2>
          <ol className="space-y-2 text-sm list-none">
            {data.nextActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-success-soft text-success text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Manual adjustments */}
      <div className="card-soft p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Manual Adjustments</h2>
          <button
            onClick={() => setAdjustModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3.5 py-2 text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" /> Add Adjustment
          </button>
        </div>
        {data.manualAdjustments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40 bg-muted/30">
                  <th className="text-left font-medium px-3 py-2">Date</th>
                  <th className="text-left font-medium px-3 py-2">Category</th>
                  <th className="text-right font-medium px-3 py-2">Points</th>
                  <th className="text-left font-medium px-3 py-2">Reason</th>
                  <th className="text-left font-medium px-3 py-2">Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {data.manualAdjustments.map((adj) => (
                  <tr key={adj.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2.5 text-muted-foreground">{adj.date}</td>
                    <td className="px-3 py-2.5">{adj.category}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${adj.points > 0 ? 'text-success' : 'text-danger'}`}>
                      {adj.points > 0 ? `+${adj.points}` : adj.points}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{adj.reason}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{adj.reviewer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No manual adjustments yet.</p>
        )}
      </div>

      {/* Daily drawer */}
      {drawerDay && (
        <div className="fixed inset-0 z-20 flex">
          <div className="flex-1 bg-foreground/20 backdrop-blur-sm" onClick={() => setDrawerDay(null)} />
          <div className="w-full max-w-md bg-card shadow-2xl overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
              <div>
                <div className="font-semibold text-base">{drawerDay}</div>
                {dayData && dayData.items.length > 0 ? (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Daily Score: {dayData.dailyPercent}% · {dayData.completed} / {dayData.activePoints} pts
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-0.5">No detailed data for this day</div>
                )}
              </div>
              <button onClick={() => setDrawerDay(null)} className="rounded-xl border border-border/70 p-2 hover:bg-muted transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            {dayData && dayData.items.length > 0 && (
              <div className="flex-1 px-6 py-4 space-y-4">
                <DrawerSection
                  title="Completed"
                  icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                  items={dayData.items.filter((i) => i.status === 'completed')}
                />
                <DrawerSection
                  title="Missed"
                  icon={<XCircle className="h-4 w-4 text-danger" />}
                  items={dayData.items.filter((i) => i.status === 'missed')}
                />
                <DrawerSection
                  title="Late"
                  icon={<Clock className="h-4 w-4 text-warning" />}
                  items={dayData.items.filter((i) => i.status === 'late')}
                />
                <DrawerSection
                  title="Not Required"
                  icon={<Circle className="h-4 w-4 text-muted-foreground" />}
                  items={dayData.items.filter((i) => i.status === 'not_required')}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-20">
          <div className="card-soft p-6 w-full max-w-md space-y-4 shadow-elevated">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Add Manual Adjustment</h2>
              <button onClick={() => setAdjustModalOpen(false)} className="rounded-xl border border-border/70 p-1.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
              <select
                value={adjustForm.category}
                onChange={(e) => setAdjustForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Points (use negative for deductions)</label>
              <input
                type="number"
                value={adjustForm.points}
                onChange={(e) => setAdjustForm((f) => ({ ...f, points: Number(e.target.value) }))}
                className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Reason</label>
              <textarea
                rows={3}
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Evidence URL (optional)</label>
              <input
                type="url"
                value={adjustForm.evidence}
                onChange={(e) => setAdjustForm((f) => ({ ...f, evidence: e.target.value }))}
                placeholder="https://…"
                className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={submitAdjustment}
                className="rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
              >
                Submit
              </button>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="rounded-xl border border-border/70 px-4 py-2.5 text-sm hover:bg-muted transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-30 bg-success text-white rounded-2xl px-5 py-3 text-sm font-medium shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Adjustment submitted successfully
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <div className="text-xs text-muted-foreground">{label}</div>
      {value ? <div className="text-base font-bold tabular-nums">{value}</div> : children}
    </div>
  );
}

function DrawerSection({ title, icon, items }: { title: string; icon: React.ReactNode; items: DayItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold mb-2">
        {icon}
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-foreground">{item.label}</span>
            <div className="shrink-0 text-right">
              <div className="tabular-nums font-medium">{item.earned} pts</div>
              {item.submittedAt && <div className="text-xs text-muted-foreground">{item.submittedAt}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
