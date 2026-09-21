interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  online:  'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25',
  offline: 'bg-slate-700/40    text-slate-400   ring-1 ring-slate-600/30',
  full:    'bg-rose-500/10    text-rose-300    ring-1 ring-rose-500/25',
  warning: 'bg-amber-500/10   text-amber-300   ring-1 ring-amber-400/25',
  normal:  'bg-sky-500/10     text-sky-300     ring-1 ring-sky-500/25',
};

const statusDot: Record<string, string> = {
  online:  'bg-emerald-400',
  offline: 'bg-slate-500',
  full:    'bg-rose-400',
  warning: 'bg-amber-400',
  normal:  'bg-sky-400',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style  = statusStyles[status] ?? statusStyles.normal;
  const dot    = statusDot[status]    ?? statusDot.normal;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${status === 'online' ? 'live-dot' : ''}`} />
      {status}
    </span>
  );
}
