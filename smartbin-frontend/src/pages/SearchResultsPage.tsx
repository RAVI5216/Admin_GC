import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSmartBinData } from '../hooks/useSmartBinData';
import { useNotifications } from '../context/NotificationContext';
import { useEffect, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useMemo as useMemoReact } from 'react';

function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (searchParams.get('q') ?? '').trim().toLowerCase();
  const { data } = useSmartBinData();
  const { notifications } = useNotifications();
  const { profile } = useProfile();
  const [employers, setEmployers] = useState<any[]>([]);

  useEffect(() => {
    const loadEmployers = async () => {
      try {
        const response = await fetch('http://localhost:5000/employers');
        if (!response.ok) {
          throw new Error('Unable to fetch employers');
        }
        const json = await response.json();
        setEmployers(json);
      } catch (error) {
        console.error(error);
      }
    };

    loadEmployers();
  }, []);

  const binResults = useMemoReact(() => {
    if (!query || !data?.bins) return [];
    return data.bins.filter((bin) => {
      const searchable = `${bin.deviceId} ${bin.location} ${bin.status}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [query, data?.bins]);

  const alertResults = useMemoReact(() => {
    if (!query) return [];
    return notifications.filter((notification) => {
      const searchable = `${notification.title} ${notification.message} ${notification.location ?? ''} ${notification.deviceId ?? ''}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [query, notifications]);

  const employerResults = useMemoReact(() => {
    if (!query) return [];
    return employers.filter((employer) => {
      const searchable = `${employer.name} ${employer.role} ${employer.email} ${employer.phone} ${employer.location ?? ''}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [query, employers]);

  if (!query) {
    return (
      <div className="space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <h3 className="text-2xl font-semibold text-white">Search</h3>
          <p className="mt-2 text-sm text-slate-400">Enter a search term to find bins, alerts, routes, or employer records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-white">Search results</h3>
            <p className="mt-2 text-sm text-slate-400">Showing results for <span className="font-medium text-white">{searchParams.get('q')}</span>.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white transition hover:border-brand-400/40 hover:bg-slate-900"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <h4 className="text-xl font-semibold text-white">Bins</h4>
          <p className="mt-2 text-sm text-slate-400">Matches on device ID, location, or status.</p>
          <div className="mt-6 space-y-4">
            {binResults.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">No bins found.</div>
            ) : (
              binResults.slice(0, 5).map((bin) => (
                <button
                  key={bin.deviceId}
                  type="button"
                  onClick={() => navigate(`/smart-bins/${encodeURIComponent(bin.deviceId)}`)}
                  className="w-full rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-left text-slate-200 transition hover:border-brand-400/40 hover:bg-slate-900"
                >
                  <p className="font-semibold text-white">{bin.location}</p>
                  <p className="text-sm text-slate-400">{bin.deviceId} • {bin.status}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <h4 className="text-xl font-semibold text-white">Alerts</h4>
          <p className="mt-2 text-sm text-slate-400">Matches on alert title, message, or location.</p>
          <div className="mt-6 space-y-4">
            {alertResults.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">No alerts found.</div>
            ) : (
              alertResults.slice(0, 5).map((alert) => (
                <div key={alert._id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-semibold text-white">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{alert.location ?? 'No location'} • {alert.time}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <h4 className="text-xl font-semibold text-white">Employers</h4>
          <p className="mt-2 text-sm text-slate-400">Matches on name, role, email, phone, or location.</p>
          <div className="mt-6 space-y-4">
            {employerResults.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">No employers found.</div>
            ) : (
              employerResults.slice(0, 5).map((employer) => (
                <div key={employer._id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-semibold text-white">{employer.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{employer.role} • {employer.location ?? 'No location'}</p>
                  <p className="mt-2 text-sm text-slate-400">{employer.email} • {employer.phone}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SearchResultsPage;
