import { useSmartBinData } from '../hooks/useSmartBinData';

function CollectionRoutesPage() {
  const { data } = useSmartBinData();
  const routeBins = data?.bins.slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <h3 className="text-2xl font-semibold text-white">Collection Routes</h3>
        <p className="mt-2 text-sm text-slate-400">Live route planning and active bin pickup locations.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
          <h4 className="text-lg font-semibold text-white">Active Route Summary</h4>
          <p className="mt-3 text-sm text-slate-400">This section updates automatically as live bin telemetry arrives.</p>
          {routeBins.length > 0 ? (
            <div className="mt-6 space-y-4">
              {routeBins.map((bin) => (
                <div key={bin.deviceId} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-semibold text-white">{bin.location}</p>
                  <p className="mt-1 text-sm text-slate-400">Device ID: {bin.deviceId}</p>
                  <p className="mt-2 text-sm text-slate-300">Fill Level: {bin.fillLevel}% • Status: {bin.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-8 text-center text-slate-400">
              Waiting for live collection route information from connected bins.
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
            <h4 className="text-lg font-semibold text-white">Route Performance</h4>
            <p className="mt-3 text-sm text-slate-400">Track the most recent smart bins in the current route.</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Route Stops</p>
                <p className="mt-2 text-3xl font-semibold text-white">{routeBins.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Live Alerts on Route</p>
                <p className="mt-2 text-3xl font-semibold text-white">{data?.alerts.length ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
            <h4 className="text-lg font-semibold text-white">Navigation</h4>
            <p className="mt-3 text-sm text-slate-400">Open the live map to see current route markers and status colors.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectionRoutesPage;
