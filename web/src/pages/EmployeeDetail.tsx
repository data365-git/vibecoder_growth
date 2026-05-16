import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, X, CheckCircle2, XCircle, Clock, Circle, Plus } from 'lucide-react';

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

const MOCK_EMPLOYEE = {
  id: 1, name: 'Алишер Каримов', role: 'UX Designer', avatar: 'АК',
  bonusBaselineUzs: 1_000_000,
  periodPercent: 88, monthlyScore: 84, bonusTier: '70%',
  workingDaysTotal: 22, workingDaysPassed: 12,
  liveBonusValueUzs: 700_000,
  accruedBonusUzs: 381_818,
  predictedFinalBonusUzs: 700_000,
  predictedFinalScore: 84,
  riskStatus: 'on_track' as const,
  categoryBreakdown: [
    { key: 'discipline_reporting', label: 'Discipline & Reporting', earned: 20, max: 25 },
    { key: 'deadline_ownership', label: 'Deadline & Ownership', earned: 18, max: 25 },
    { key: 'professional_learning', label: 'Professional Learning', earned: 14, max: 20 },
    { key: 'uxui_taste', label: 'UX/UI Taste', earned: 14, max: 15 },
    { key: 'business_thinking', label: 'Business Thinking', earned: 9, max: 10 },
    { key: 'simple_explanation', label: 'Simple Explanation', earned: 9, max: 10 },
  ] as CategoryRow[],
  nextActions: [
    'Submit daily reports on time for the next 6 working days',
    'Add 3 missing design references this week',
    'Write one business insight note before Friday',
    'Complete task ownership brief for current sprint',
  ],
  manualAdjustments: [
    { id: 1, date: '2026-05-10', category: 'Discipline & Reporting', points: -3, reason: 'Missed 3 standups during team event', reviewer: 'Admin' },
    { id: 2, date: '2026-05-05', category: 'Professional Learning', points: +2, reason: 'Exceptional learning note quality', reviewer: 'Admin' },
  ] as Adjustment[],
};

const MOCK_CALENDAR: Record<string, number> = {
  '2026-05-01': 100, '2026-05-02': 85, '2026-05-03': 70,
  '2026-05-05': 90, '2026-05-06': 100, '2026-05-07': 60,
  '2026-05-08': 80, '2026-05-09': 95, '2026-05-10': 45,
  '2026-05-12': 100, '2026-05-13': 75, '2026-05-14': 85,
  '2026-05-15': 90, '2026-05-16': 100, '2026-05-17': 70,
};

const MOCK_DAY_DETAIL = {
  date: '2026-05-14', dailyPercent: 85, activePoints: 100, completed: 85, missed: 15, late: 0,
  items: [
    { key: 'daily_report_on_time', label: 'Daily report before 18:00', status: 'completed', weight: 20, earned: 20, submittedAt: '17:32' },
    { key: 'standup_participation', label: 'Stand-up submitted', status: 'completed', weight: 10, earned: 10, submittedAt: '09:15' },
    { key: 'learning_note', label: 'Professional learning note', status: 'completed', weight: 15, earned: 15, submittedAt: '14:20' },
    { key: 'design_ref', label: 'Design reference with 3+ observations', status: 'completed', weight: 15, earned: 15, submittedAt: '11:05' },
    { key: 'task_delivery', label: 'Task ownership / delivery', status: 'completed', weight: 25, earned: 25, submittedAt: '16:58' },
    { key: 'status_updates_offline', label: 'Status updates (offline mode)', status: 'not_required', weight: 15, earned: 0 },
  ] as DayItem[],
};

const TODAY = '2026-05-17';

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

function buildCalendarDays(): { dateStr: string; day: number; isSunday: boolean }[] {
  const year = 2026, month = 4; // May = index 4
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { dateStr: string; day: number; isSunday: boolean }[] = [];
  for (let i = 0; i < offset; i++) cells.push({ dateStr: '', day: 0, isSunday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `2026-05-${String(d).padStart(2, '0')}`;
    const dow = new Date(year, month, d).getDay();
    cells.push({ dateStr, day: d, isSunday: dow === 0 });
  }
  return cells;
}

const CALENDAR_DAYS = buildCalendarDays();
const CATEGORIES = ['Discipline & Reporting', 'Deadline & Ownership', 'Professional Learning', 'UX/UI Taste', 'Business Thinking', 'Simple Explanation'];

export default function EmployeeDetail() {
  const { vibecoderId } = useParams();
  const navigate = useNavigate();
  const emp = MOCK_EMPLOYEE;

  const [drawerDay, setDrawerDay] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ category: CATEGORIES[0], points: 0, reason: '', evidence: '' });

  if (String(emp.id) !== vibecoderId) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/performance')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Back to Performance
        </button>
        <div className="card-soft p-8 text-center text-muted-foreground">Employee not found in mock data.</div>
      </div>
    );
  }

  const riskMessage = emp.riskStatus === 'on_track'
    ? `On track — maintain current pace for ${emp.workingDaysTotal - emp.workingDaysPassed} more working days`
    : emp.riskStatus === 'warning'
    ? `Needs more points to reach 90%`
    : `Critical — at current pace bonus tier is 0%`;

  const riskChipClass = emp.riskStatus === 'on_track' ? 'chip-success' : emp.riskStatus === 'warning' ? 'chip-primary' : 'chip-danger';

  function submitAdjustment() {
    setAdjustModalOpen(false);
    setToastVisible(true);
    setAdjustForm({ category: CATEGORIES[0], points: 0, reason: '', evidence: '' });
    setTimeout(() => setToastVisible(false), 3000);
  }

  const drawerDetail = drawerDay === MOCK_DAY_DETAIL.date ? MOCK_DAY_DETAIL : null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/performance')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Performance
      </button>

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
            <KpiTile label="Period Score" value={`${emp.monthlyScore} / 100`} />
            <KpiTile label="Bonus Tier">
              <span className={emp.bonusTier === '100%' ? 'chip-success' : emp.bonusTier === '70%' ? 'chip-primary' : emp.bonusTier === '40%' ? 'chip-warning' : 'chip-danger'}>
                {emp.bonusTier}
              </span>
            </KpiTile>
            <KpiTile label="Earned Till Today" value={`${emp.accruedBonusUzs.toLocaleString()} UZS`} />
            <KpiTile label="Predicted Final Bonus" value={`${emp.predictedFinalBonusUzs.toLocaleString()} UZS`} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <span className={riskChipClass}>{RISK_LABELS[emp.riskStatus]}</span>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Performance tier:</span><span>{emp.bonusTier}</span></div>
              <div className="border-t border-border/60 my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">If month ended today:</span>
                <span>{emp.bonusBaselineUzs.toLocaleString()} × {emp.bonusTier} = {emp.liveBonusValueUzs.toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Earned until today:</span>
                <span>{emp.liveBonusValueUzs.toLocaleString()} × {emp.workingDaysPassed} / {emp.workingDaysTotal} = {emp.accruedBonusUzs.toLocaleString()} UZS</span>
              </div>
              <div className="text-xs text-muted-foreground pl-0">({emp.workingDaysPassed} working days passed of {emp.workingDaysTotal} total)</div>
              <div className="border-t border-border/60 my-2" />
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Predicted final bonus:</span>
                <span>{emp.predictedFinalBonusUzs.toLocaleString()} UZS</span>
              </div>
              <div className="text-xs text-muted-foreground">(based on current pace)</div>
            </div>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="card-soft p-6 space-y-4">
        <h2 className="text-base font-semibold">Category Breakdown</h2>
        <div className="space-y-3">
          {emp.categoryBreakdown.map((cat) => {
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

      {/* Performance calendar */}
      <div className="card-soft p-6">
        <h2 className="text-base font-semibold mb-4">Performance Calendar — May 2026</h2>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {CALENDAR_DAYS.map((cell, i) => {
            if (!cell.day) return <div key={i} />;
            const score = MOCK_CALENDAR[cell.dateStr];
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

      {/* Missing requirements */}
      <div className="card-soft p-6 space-y-3">
        <h2 className="text-base font-semibold">Missing Requirements This Period</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><XCircle className="h-4 w-4 text-danger shrink-0" /> Design reference (May 6)</li>
          <li className="flex items-center gap-2"><XCircle className="h-4 w-4 text-danger shrink-0" /> Status update (May 3)</li>
        </ul>
      </div>

      {/* What to do next */}
      <div className="card-soft p-6 space-y-3 border-l-4 border-l-success">
        <h2 className="text-base font-semibold">What to Do Next</h2>
        <ol className="space-y-2 text-sm list-none">
          {emp.nextActions.map((action, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-success-soft text-success text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <span>{action}</span>
            </li>
          ))}
        </ol>
      </div>

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
              {emp.manualAdjustments.map((adj) => (
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
      </div>

      {/* Daily drawer */}
      {drawerDay && (
        <div className="fixed inset-0 z-20 flex">
          <div className="flex-1 bg-foreground/20 backdrop-blur-sm" onClick={() => setDrawerDay(null)} />
          <div className="w-full max-w-md bg-card shadow-2xl overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
              <div>
                <div className="font-semibold text-base">{drawerDay}</div>
                {drawerDetail && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Daily Score: {drawerDetail.dailyPercent}% · {drawerDetail.completed} / {drawerDetail.activePoints} pts
                  </div>
                )}
                {!drawerDetail && <div className="text-sm text-muted-foreground mt-0.5">No detailed data for this day</div>}
              </div>
              <button onClick={() => setDrawerDay(null)} className="rounded-xl border border-border/70 p-2 hover:bg-muted transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            {drawerDetail && (
              <div className="flex-1 px-6 py-4 space-y-4">
                <DrawerSection
                  title="Completed"
                  icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                  items={drawerDetail.items.filter((i) => i.status === 'completed')}
                />
                <DrawerSection
                  title="Missed"
                  icon={<XCircle className="h-4 w-4 text-danger" />}
                  items={drawerDetail.items.filter((i) => i.status === 'missed')}
                />
                <DrawerSection
                  title="Late"
                  icon={<Clock className="h-4 w-4 text-warning" />}
                  items={drawerDetail.items.filter((i) => i.status === 'late')}
                />
                <DrawerSection
                  title="Not Required"
                  icon={<Circle className="h-4 w-4 text-muted-foreground" />}
                  items={drawerDetail.items.filter((i) => i.status === 'not_required')}
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

const RISK_LABELS: Record<string, string> = {
  on_track: 'On Track',
  warning: 'Warning',
  weak: 'Weak',
  critical: 'Critical',
};

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
