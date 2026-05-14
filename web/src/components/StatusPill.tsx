export type ReportStatus = 'on_time' | 'late' | 'missed' | 'pending';

const LABEL: Record<ReportStatus, string> = {
  on_time: 'On track',
  late: 'At risk',
  missed: 'Missed',
  pending: 'Pending',
};

const STYLE: Record<ReportStatus, string> = {
  on_time: 'bg-success-soft text-success',
  late: 'bg-warning-soft text-warning',
  missed: 'bg-danger-soft text-danger',
  pending: 'bg-muted text-muted-foreground',
};

export function StatusPill({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
