import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';

type PositionTuple = [number, number];

function LiveMapPage() {
  const [userLocation, setUserLocation] = useState<PositionTuple | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocationError(null);
      },
      (error) => {
        const message =
          error.code === 1
            ? 'Location access was denied. Please allow location access to see your live map.'
            : 'Unable to read your location right now. Please try again.';
        setLocationError(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const center = useMemo(() => userLocation ?? ([12.9716, 77.5946] as PositionTuple), [userLocation]);

  const RecenterMap = ({ center }: { center: PositionTuple }) => {
    const map = useMap();

    useEffect(() => {
      map.setView(center, 16);
    }, [center, map]);

    return null;
  };

  const createUserIcon = () =>
    L.divIcon({
      html: `
        <div class="live-location-marker">
          <div class="live-location-core"></div>
        </div>
      `,
      className: 'live-location-wrapper',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

  return (
    <div className="space-y-6">
      <style>{`
        .live-location-wrapper { width: 28px; height: 28px; }
        .live-location-marker {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(14, 165, 233, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1.4s infinite ease-in-out;
        }
        .live-location-core {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.25);
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <h3 className="text-2xl font-semibold text-white">Live Location Map</h3>
        <p className="mt-2 text-sm text-slate-400">Your map follows your current GPS position in real time.</p>
      </div>
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-4 shadow-panel">
        <MapContainer center={center} zoom={16} className="h-[680px] rounded-[28px]">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <RecenterMap center={center} />
          {userLocation ? (
            <>
              <Circle center={userLocation} radius={80} pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.15 }} />
              <Marker position={userLocation} icon={createUserIcon()}>
                <Popup>
                  <div className="text-slate-900">
                    <strong>You are here</strong>
                    <p>Live GPS location</p>
                  </div>
                </Popup>
              </Marker>
            </>
          ) : null}
        </MapContainer>
        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-slate-300">
          {locationError ? (
            <p className="text-sm text-amber-300">{locationError}</p>
          ) : (
            <p className="text-sm text-slate-400">
              {userLocation ? 'Your location is updating live.' : 'Waiting for your location...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveMapPage;
