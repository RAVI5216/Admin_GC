interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  online: 'bg-emerald-500/15 text-emerald-200',
  offline: 'bg-slate-700/15 text-slate-200',
  full: 'bg-rose-500/15 text-rose-200',
  warning: 'bg-amber-500/15 text-amber-200',
  normal: 'bg-sky-500/15 text-sky-200',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] ?? statusStyles.normal}`}>{status}</span>;
}
