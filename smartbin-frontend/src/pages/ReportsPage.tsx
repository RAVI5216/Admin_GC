function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <h3 className="text-2xl font-semibold text-white">Reports</h3>
        <p className="mt-2 text-sm text-slate-400">Export the latest smart bin analytics and summaries.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
          <h4 className="text-lg font-semibold text-white">Export PDF</h4>
          <p className="mt-3 text-sm text-slate-400">Generate a polished PDF report for fleet management.</p>
          <button className="mt-6 rounded-3xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400">Download PDF</button>
        </div>
        <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
          <h4 className="text-lg font-semibold text-white">Export Excel</h4>
          <p className="mt-3 text-sm text-slate-400">Download raw telemetry and collection history as Excel.</p>
          <button className="mt-6 rounded-3xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400">Download Excel</button>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
