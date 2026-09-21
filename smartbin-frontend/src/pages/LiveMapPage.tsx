import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation2 } from 'lucide-react';

type PositionTuple = [number, number];

function RecenterMap({ center }: { center: PositionTuple }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 16); }, [center, map]);
  return null;
}

function createUserIcon() {
  return L.divIcon({
    html: `<div class="live-location-marker"><div class="live-location-core"></div></div>`,
    className: 'live-location-wrapper',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function LiveMapPage() {
  const [userLocation,   setUserLocation]   = useState<PositionTuple | null>(null);
  const [locationError,  setLocationError]  = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocationError(null);
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? 'Location access was denied. Please allow access to see your live position.'
            : 'Unable to read your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const center = useMemo<PositionTuple>(
    () => userLocation ?? [12.9716, 77.5946],
    [userLocation]
  );

  return (
    <div className="space-y-4">

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Live Location Map</h1>
          <p className="mt-0.5 text-sm text-slate-500">Map follows your current GPS position in real time.</p>
        </div>
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
          userLocation
            ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
            : 'bg-slate-700/30 text-slate-400 ring-1 ring-slate-600/20'
        }`}>
          <Navigation2 size={12} className={userLocation ? 'live-dot' : ''} />
          {userLocation ? 'GPS Active' : 'Acquiring…'}
        </div>
      </div>

      {/* Map card */}
      <div className="glass-panel shadow-panel overflow-hidden rounded-2xl p-3">
        <MapContainer center={center} zoom={16} className="relative z-0 h-[600px] w-full rounded-xl">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <RecenterMap center={center} />
          {userLocation && (
            <>
              <Circle
                center={userLocation}
                radius={80}
                pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.12 }}
              />
              <Marker position={userLocation} icon={createUserIcon()}>
                <Popup>
                  <div className="text-sm text-slate-900">
                    <p className="font-semibold">You are here</p>
                    <p className="text-xs text-gray-500">Live GPS location</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>

      {/* Location info bar */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
        locationError
          ? 'border-amber-400/20 bg-amber-400/5 text-amber-300'
          : 'border-white/[0.06] bg-white/[0.02] text-slate-400'
      }`}>
        <MapPin size={15} className="shrink-0" />
        {locationError ? (
          <span>{locationError}</span>
        ) : userLocation ? (
          <span>
            Location active —{' '}
            <span className="font-mono text-slate-300">
              {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
            </span>
          </span>
        ) : (
          <span>Waiting for your location…</span>
        )}
      </div>
    </div>
  );
}

export default LiveMapPage;
