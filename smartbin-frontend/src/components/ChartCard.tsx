import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  helpText: string;
  children: ReactNode;
}

export default function ChartCard({ title, helpText, children }: ChartCardProps) {
  return (
    <div className="glass-panel shadow-card rounded-2xl p-5">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{helpText}</p>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}
