import { useSmartBinData } from '../hooks/useSmartBinData';

function CollectionHistoryPage() {
  const { data } = useSmartBinData();

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <h3 className="text-2xl font-semibold text-white">Collection History</h3>
        <p className="mt-2 text-sm text-slate-400">Review recent bin telemetry updates and route snapshots.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
          <h4 className="text-lg font-semibold text-white">Most Recent Updates</h4>
          <div className="mt-6 space-y-4">
            {(data?.charts.fillLevelHistory.slice(-4).reverse() ?? []).map((point) => (
              <div key={point.time} className="rounded-3xl bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">{point.time}</p>
                <p className="mt-2 text-xl font-semibold text-white">Fill Level: {point.value}%</p>
              </div>
            ))}
            {!data?.charts.fillLevelHistory.length ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-8 text-center text-slate-400">
                Waiting for live collection history from the connected backend.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
          <h4 className="text-lg font-semibold text-white">History Summary</h4>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Total Bins Seen</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data?.totals.totalBins ?? 0}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Live Alerts Recorded</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data?.totals.liveAlerts ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectionHistoryPage;
