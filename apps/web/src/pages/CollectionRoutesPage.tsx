import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSmartBinData } from '../hooks/useSmartBinData';
import {
  Navigation,
  Route as RouteIcon,
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Printer,
  Sparkles,
} from 'lucide-react';

type PositionTuple = [number, number];

// Campus Depot / Gate Anchor
const CAMPUS_DEPOT: { name: string; coords: PositionTuple } = {
  name: 'Campus Waste Depot (Main Gate)',
  coords: [22.3675113, 70.7990184],
};

function haversineDistance([lat1, lon1]: PositionTuple, [lat2, lon2]: PositionTuple): number {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function RecenterMap({ center }: { center: PositionTuple }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

function createStopIcon(stopNum: number, fillLevel: number) {
  const bg = fillLevel >= 75 ? '#f43f5e' : fillLevel >= 45 ? '#f59e0b' : '#10b981';
  return L.divIcon({
    html: `
      <div style="
        background: #0f172a;
        border: 2px solid ${bg};
        box-shadow: 0 0 10px ${bg}88;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #ffffff;
      ">
        <span style="font-size: 11px; font-weight: 800; line-height: 1;">${stopNum}</span>
        <span style="font-size: 8px; color: ${bg}; font-weight: 700;">${fillLevel}%</span>
      </div>
    `,
    className: 'custom-route-stop-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createDepotIcon() {
  return L.divIcon({
    html: `
      <div style="
        background: #0284c7;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(2, 132, 199, 0.8);
        border-radius: 8px;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 15px;
      ">
        🏁
      </div>
    `,
    className: 'custom-depot-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

type SmartBinItem = NonNullable<ReturnType<typeof useSmartBinData>['data']>['bins'][number];
type SmartBinWithCoords = SmartBinItem & {
  latitude: number;
  longitude: number;
};

function CollectionRoutesPage() {
  const { data } = useSmartBinData();
  const [filterMode, setFilterMode] = useState<'all' | 'priority'>('priority');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Eligible bins with valid coordinates
  const validBins = useMemo<SmartBinWithCoords[]>(() => {
    return (data?.bins ?? []).filter(
      (b): b is SmartBinWithCoords => typeof b.latitude === 'number' && typeof b.longitude === 'number'
    );
  }, [data]);

  // Filter bins based on mode
  const candidateBins = useMemo(() => {
    if (filterMode === 'priority') {
      // Prioritize bins that are at least 45% full
      const urgent = validBins.filter((b) => b.fillLevel >= 45);
      return urgent.length > 0 ? urgent : validBins;
    }
    return validBins;
  }, [validBins, filterMode]);

  // Calculate Nearest Neighbor Route starting from CAMPUS_DEPOT
  const optimizedRoute = useMemo(() => {
    if (candidateBins.length === 0) return [];

    const unvisited = [...candidateBins];
    const route: typeof candidateBins = [];
    let currentPos: PositionTuple = CAMPUS_DEPOT.coords;

    while (unvisited.length > 0) {
      // Find nearest bin, with a bonus factor for higher fill levels
      let bestIndex = 0;
      let minCost = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const bin = unvisited[i];
        const dist = haversineDistance(currentPos, [bin.latitude, bin.longitude]);
        // Priority weight: higher fill level lowers effective routing penalty
        const urgencyDiscount = (bin.fillLevel / 100) * 150; // up to 150m discount
        const cost = Math.max(10, dist - urgencyDiscount);

        if (cost < minCost) {
          minCost = cost;
          bestIndex = i;
        }
      }

      const nextBin = unvisited.splice(bestIndex, 1)[0];
      route.push(nextBin);
      currentPos = [nextBin.latitude, nextBin.longitude];
    }

    return route;
  }, [candidateBins]);

  // Calculate polyline points: Depot -> Stop 1 -> Stop 2 -> ... -> Depot
  const routePolyline = useMemo<PositionTuple[]>(() => {
    if (optimizedRoute.length === 0) return [];
    const pts: PositionTuple[] = [CAMPUS_DEPOT.coords];
    optimizedRoute.forEach((b) => pts.push([b.latitude, b.longitude]));
    pts.push(CAMPUS_DEPOT.coords); // Return to depot
    return pts;
  }, [optimizedRoute]);

  // Route statistics
  const routeStats = useMemo(() => {
    if (optimizedRoute.length === 0) {
      return { totalDistanceMeters: 0, estimatedMinutes: 0, criticalCount: 0 };
    }

    let totalDist = 0;
    for (let i = 0; i < routePolyline.length - 1; i++) {
      totalDist += haversineDistance(routePolyline[i], routePolyline[i + 1]);
    }

    // 4 minutes per pickup stop + 3 minutes per km travel
    const estimatedMinutes = Math.round(optimizedRoute.length * 4 + (totalDist / 1000) * 3);
    const criticalCount = optimizedRoute.filter((b) => b.fillLevel >= 75).length;

    return {
      totalDistanceMeters: Math.round(totalDist),
      estimatedMinutes,
      criticalCount,
    };
  }, [optimizedRoute, routePolyline]);

  const handleDispatch = () => {
    setDispatchStatus('Crew dispatched! Collection route instructions transmitted.');
    setTimeout(() => setDispatchStatus(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-panel md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
            <RouteIcon size={13} />
            AI Dynamic Route Optimization
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Smart Collection Routes</h2>
          <p className="mt-1 text-sm text-slate-400">
            Telemetry-driven pickup itinerary calculated to minimize campus transit time and prioritize full bins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setFilterMode('priority')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterMode === 'priority'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Priority Bins (≥45%)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Bins ({validBins.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <Printer size={14} />
            Print Manifest
          </button>

          <button
            type="button"
            onClick={handleDispatch}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition"
          >
            <Send size={14} />
            Dispatch Crew
          </button>
        </div>
      </div>

      {dispatchStatus && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={16} />
          {dispatchStatus}
        </div>
      )}

      {/* Route Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-slate-400">Total Route Stops</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{optimizedRoute.length}</span>
            <span className="text-xs text-slate-400">bins in sequence</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-slate-400">Total Loop Distance</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-cyan-400">
              {(routeStats.totalDistanceMeters / 1000).toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">kilometers</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-slate-400">Estimated Duration</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-400">{routeStats.estimatedMinutes}</span>
            <span className="text-xs text-slate-400">minutes</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-slate-400">Critical Priority Stops</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-400">{routeStats.criticalCount}</span>
            <span className="text-xs text-slate-400">fill &gt; 75%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Sequential Itinerary */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Leaflet Map (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-panel flex flex-col h-[560px]">
          <div className="border-b border-white/10 px-5 py-3.5 bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-2">
              <Navigation size={14} className="text-emerald-400" />
              Live Route Navigation Vector
            </span>
            <span className="text-[11px] text-slate-400">
              Depot Loop: Green dashed line
            </span>
          </div>

          <div className="flex-1 relative">
            <MapContainer
              center={CAMPUS_DEPOT.coords}
              zoom={16}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', background: '#090d16' }}
            >
              <RecenterMap center={CAMPUS_DEPOT.coords} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              {/* Depot Marker */}
              <Marker position={CAMPUS_DEPOT.coords} icon={createDepotIcon()}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{CAMPUS_DEPOT.name}</p>
                    <p className="text-slate-600">Start & Return Station</p>
                  </div>
                </Popup>
              </Marker>

              {/* Waypoint Polyline connecting stops in order */}
              {routePolyline.length > 1 && (
                <Polyline
                  positions={routePolyline}
                  color="#10b981"
                  weight={4}
                  opacity={0.85}
                  dashArray="8, 8"
                />
              )}

              {/* Numbered Stop Markers */}
              {optimizedRoute.map((bin, index) => (
                <Marker
                  key={bin.deviceId}
                  position={[bin.latitude, bin.longitude]}
                  icon={createStopIcon(index + 1, bin.fillLevel)}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-900">
                        Stop #{index + 1}: {bin.deviceId}
                      </p>
                      <p className="text-slate-600">{bin.location}</p>
                      <p className="font-semibold text-brand-600">
                        Fill Level: {bin.fillLevel}% ({bin.status})
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Sequential Itinerary (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-3xl border border-white/10 p-5 shadow-panel flex flex-col h-[560px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                Optimized Waypoint Sequence
              </h3>
              <p className="text-[11px] text-slate-400">Order computed to minimize transit travel</p>
            </div>
            <span className="text-xs font-semibold text-brand-300">
              {optimizedRoute.length} Stops
            </span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1">
            {/* Start point */}
            <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-[10px]">
                DEPOT
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{CAMPUS_DEPOT.name}</p>
                <p className="text-[11px] text-slate-400">Dispatch departure coordinates</p>
              </div>
            </div>

            {/* Sequence items */}
            {optimizedRoute.map((bin, idx) => {
              const isCritical = bin.fillLevel >= 75;
              const isWarning = bin.fillLevel >= 45 && bin.fillLevel < 75;
              return (
                <div
                  key={bin.deviceId}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-xs transition ${
                    isCritical
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : isWarning
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                      isCritical
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : isWarning
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-white truncate">{bin.location}</p>
                      <span
                        className={`text-[11px] font-bold shrink-0 ${
                          isCritical
                            ? 'text-rose-400'
                            : isWarning
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {bin.fillLevel}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono">{bin.deviceId}</span>
                      <span>{bin.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Return point */}
            <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-[10px]">
                RETURN
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">Depot Unloading Dock</p>
                <p className="text-[11px] text-slate-400">Route completes at Main Gate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectionRoutesPage;
