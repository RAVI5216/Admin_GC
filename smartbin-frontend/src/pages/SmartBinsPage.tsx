import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBinData } from '../hooks/useSmartBinData';
import StatusBadge from '../components/StatusBadge';

function SmartBinsPage() {
  const { data } = useSmartBinData();
  const navigate = useNavigate();

  const rows = useMemo(() => data?.bins ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <h3 className="text-2xl font-semibold text-white">Smart Bin Fleet</h3>
        <p className="mt-2 text-sm text-slate-400">Explore each device and view the latest telemetry details.</p>
      </div>
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 shadow-panel">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-slate-950/80 text-left text-slate-400">
            <tr>
              <th className="px-6 py-4">Device ID</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Fill Level</th>
              <th className="px-6 py-4">Temperature</th>
              <th className="px-6 py-4">Humidity</th>
              <th className="px-6 py-4">Gas Level</th>
              <th className="px-6 py-4">Battery</th>
              <th className="px-6 py-4">RSSI</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-slate-950/50">
            {rows.map((bin) => (
              <tr
                key={bin.deviceId}
                className="cursor-pointer transition hover:bg-white/5"
                onClick={() => navigate(`/smart-bins/${encodeURIComponent(bin.deviceId)}`)}
              >
                <td className="px-6 py-4 text-slate-100">{bin.deviceId}</td>
                <td className="px-6 py-4 text-slate-300">{bin.location}</td>
                <td className="px-6 py-4 text-slate-100">{bin.fillLevel}%</td>
                <td className="px-6 py-4 text-slate-100">{bin.temperature}°C</td>
                <td className="px-6 py-4 text-slate-100">{bin.humidity}%</td>
                <td className="px-6 py-4 text-slate-100">{bin.gasLevel}</td>
                <td className="px-6 py-4 text-slate-100">{bin.battery}%</td>
                <td className="px-6 py-4 text-slate-100">{bin.rssi} dBm</td>
                <td className="px-6 py-4"><StatusBadge status={bin.status} /></td>
                <td className="px-6 py-4 text-slate-300">{bin.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SmartBinsPage;
