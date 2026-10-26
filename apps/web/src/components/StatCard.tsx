import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  highlight?: string;
  accent?: 'blue' | 'emerald' | 'amber' | 'rose';
}

const accentMap = {
  blue:    { icon: 'bg-brand-500/10 text-brand-400', bar: 'bg-brand-500'   },
  emerald: { icon: 'bg-emerald-500/10 text-emerald-400', bar: 'bg-emerald-500' },
  amber:   { icon: 'bg-amber-500/10 text-amber-400',   bar: 'bg-amber-400'  },
  rose:    { icon: 'bg-rose-500/10 text-rose-400',     bar: 'bg-rose-500'   },
};

export default function StatCard({ label, value, icon, highlight, accent = 'blue' }: StatCardProps) {
  const colors = accentMap[accent];
  return (
    <div className="glass-panel shadow-card rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-2.5 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>
          {icon}
        </div>
      </div>
      {highlight && (
        <p className="mt-3 text-xs text-slate-500">{highlight}</p>
      )}
    </div>
  );
}
