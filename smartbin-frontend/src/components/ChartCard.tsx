import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  helpText: string;
  children: ReactNode;
}

export default function ChartCard({ title, helpText, children }: ChartCardProps) {
  return (
    <div className="glass-panel rounded-[28px] border border-white/10 p-5 shadow-panel">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-400">{helpText}</p>
        </div>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}
