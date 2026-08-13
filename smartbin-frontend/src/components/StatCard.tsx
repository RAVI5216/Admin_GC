import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  highlight?: string;
}

export default function StatCard({ label, value, icon, highlight }: StatCardProps) {
  return (
    <div className="glass-panel rounded-[28px] border border-white/10 p-5 shadow-panel transition hover:-translate-y-0.5 hover:bg-slate-900/70">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="rounded-3xl bg-brand-500/10 p-3 text-brand-300">{icon}</div>
      </div>
      {highlight ? <p className="mt-4 text-sm text-brand-200">{highlight}</p> : null}
    </div>
  );
}
