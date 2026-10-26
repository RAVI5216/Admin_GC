import { useState, useEffect } from 'react';
import {
  Sliders,
  Bell,
  Cpu,
  Brain,
  MapPin,
  Save,
  RotateCcw,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useSmartBinData } from '../hooks/useSmartBinData';

interface DashboardSettings {
  // Telemetry
  refreshInterval: number; // in seconds: 5, 10, 30, 60
  autoSync: boolean;
  binHeightCm: number;

  // Alerts & Thresholds
  warningThreshold: number; // e.g. 70%
  criticalThreshold: number; // e.g. 85%
  enableAudioAlerts: boolean;
  autoCreateTasksOnCritical: boolean;

  // AI Triage
  aiTriageEnabled: boolean;
  minAiConfidence: number; // e.g. 75%
  autoAssignDepartment: boolean;

  // Map & Campus
  defaultZoom: number; // 14, 15, 16, 17
  autoCenterOnSelect: boolean;
  mapStyle: 'standard' | 'sat' | 'dark';
}

const DEFAULT_SETTINGS: DashboardSettings = {
  refreshInterval: 10,
  autoSync: true,
  binHeightCm: 100,

  warningThreshold: 70,
  criticalThreshold: 85,
  enableAudioAlerts: false,
  autoCreateTasksOnCritical: true,

  aiTriageEnabled: true,
  minAiConfidence: 75,
  autoAssignDepartment: true,

  defaultZoom: 15,
  autoCenterOnSelect: true,
  mapStyle: 'standard',
};

const STORAGE_KEY = 'garbageguardian_settings';

function SettingsPage() {
  const { data } = useSmartBinData();
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [activeTab, setActiveTab] = useState<'general' | 'thresholds' | 'ai' | 'map' | 'system'>('general');
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (savedStatus) {
      const timer = setTimeout(() => setSavedStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [savedStatus]);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedStatus('Settings saved successfully!');
    } catch (e) {
      setSavedStatus('Failed to save settings to storage.');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      setSavedStatus('Default settings restored.');
    }
  };

  const handleExportDiagnostics = () => {
    const diagnosticPayload = {
      timestamp: new Date().toISOString(),
      platform: 'GarbageGuardian Smart Campus Dashboard',
      settings,
      smartBinsCount: data?.bins.length ?? 0,
      activeAlertsCount: data?.alerts.length ?? 0,
      totalCollections: data?.totals.collectionsToday ?? 0,
      bins: data?.bins.map((b) => ({
        deviceId: b.deviceId,
        location: b.location,
        fillLevel: b.fillLevel,
        status: b.status,
        lastUpdated: b.lastUpdated,
      })),
      clientUserAgent: navigator.userAgent,
    };

    const blob = new Blob([JSON.stringify(diagnosticPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garbageguardian-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSavedStatus('Diagnostics file downloaded.');
  };

  const handleClearCache = () => {
    if (window.confirm('Clear all local application cache? This will reset local filters and stored UI preferences.')) {
      const authTokens = {
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
        savedEmail: localStorage.getItem('savedEmail'),
      };
      localStorage.clear();
      if (authTokens.token) localStorage.setItem('token', authTokens.token);
      if (authTokens.user) localStorage.setItem('user', authTokens.user);
      if (authTokens.savedEmail) localStorage.setItem('savedEmail', authTokens.savedEmail);
      setSettings(DEFAULT_SETTINGS);
      setSavedStatus('Cache cleared. Authentication session preserved.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-panel md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/20">
            <Sliders size={13} />
            System Control & Configuration
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">System Settings</h2>
          <p className="mt-1 text-sm text-slate-400">
            Configure telemetry frequencies, fill alert thresholds, AI triage parameters, and campus map defaults.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition"
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>

      {savedStatus && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={16} />
          {savedStatus}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'general', label: 'General & Telemetry', icon: Cpu },
          { id: 'thresholds', label: 'Alerts & Thresholds', icon: Bell },
          { id: 'ai', label: 'AI Classifier', icon: Brain },
          { id: 'map', label: 'Map & Campus', icon: MapPin },
          { id: 'system', label: 'Diagnostics & Storage', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${
                isActive
                  ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30 font-semibold'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: General & Telemetry */}
      {activeTab === 'general' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Cpu size={16} className="text-brand-400" />
              Telemetry Sync Intervals
            </h3>
            <p className="text-xs text-slate-400">
              Controls how frequently the dashboard queries DynamoDB and updates live sensors.
            </p>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-medium text-slate-300">Sync Interval (Seconds)</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, refreshInterval: sec }))}
                    className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                      settings.refreshInterval === sec
                        ? 'bg-brand-500 text-white shadow-md'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">Continuous Auto-Sync</p>
                <p className="text-[11px] text-slate-400">Automatically stream telemetry updates via WebSocket</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSync}
                onChange={(e) => setSettings((s) => ({ ...s, autoSync: e.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-500 focus:ring-brand-400"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders size={16} className="text-cyan-400" />
              Hardware Calibration
            </h3>
            <p className="text-xs text-slate-400">
              Calibration parameters used to convert ultrasonic distance readings into fill percentages.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-slate-300">Default Bin Depth (cm)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={settings.binHeightCm}
                  onChange={(e) => setSettings((s) => ({ ...s, binHeightCm: Number(e.target.value) || 100 }))}
                  className="w-32 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400">cm from sensor to bin bottom</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info size={13} className="text-blue-400" />
                Active Hardware Note
              </p>
              <p>
                Connected smart bins ({data?.bins.length ?? 8} detected) publish pre-calculated fill percentages directly to DynamoDB.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Alerts & Thresholds */}
      {activeTab === 'thresholds' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel space-y-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Bell size={16} className="text-amber-400" />
              Fill Level Thresholds
            </h3>
            <p className="text-xs text-slate-400">
              Determine when smart bins shift from normal to warning and critical status.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-amber-300">Warning Fill Level</span>
                  <span className="font-bold text-white">{settings.warningThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="80"
                  value={settings.warningThreshold}
                  onChange={(e) => setSettings((s) => ({ ...s, warningThreshold: Number(e.target.value) }))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-rose-400">Critical / Overflow Threshold</span>
                  <span className="font-bold text-white">{settings.criticalThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="95"
                  value={settings.criticalThreshold}
                  onChange={(e) => setSettings((s) => ({ ...s, criticalThreshold: Number(e.target.value) }))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-400" />
              Automated Dispatch & Actions
            </h3>
            <p className="text-xs text-slate-400">
              Configure actions triggered automatically when bins breach critical capacity.
            </p>

            <div className="space-y-4 pt-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-white">Auto-generate Collection Tasks</p>
                  <p className="text-[11px] text-slate-400">Creates a collection task in the tasks queue when fill &gt; {settings.criticalThreshold}%</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoCreateTasksOnCritical}
                  onChange={(e) => setSettings((s) => ({ ...s, autoCreateTasksOnCritical: e.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-500 focus:ring-brand-400"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-white/10">
                <div>
                  <p className="text-xs font-medium text-white">Audio Alert on Overflow</p>
                  <p className="text-[11px] text-slate-400">Play a discrete chime when new critical alert arrives</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAudioAlerts}
                  onChange={(e) => setSettings((s) => ({ ...s, enableAudioAlerts: e.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-500 focus:ring-brand-400"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI Classifier */}
      {activeTab === 'ai' && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Brain size={18} className="text-purple-400" />
                Gemini NLP & AI Report Triage
              </h3>
              <p className="text-xs text-slate-400">
                AI categorizes incoming citizen reports, estimates urgency, and suggests resolution steps.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300 ring-1 ring-purple-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              Engine Online (Gemini + Local NLP)
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-white">Enable AI Classification on Ingest</p>
                  <p className="text-[11px] text-slate-400">Automatically run reports through the NLP classifier</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.aiTriageEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, aiTriageEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-500 focus:ring-brand-400"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-white/10">
                <div>
                  <p className="text-xs font-medium text-white">Auto-route to Department</p>
                  <p className="text-[11px] text-slate-400">Forward to Waste Collection or Maintenance based on AI recommendation</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoAssignDepartment}
                  onChange={(e) => setSettings((s) => ({ ...s, autoAssignDepartment: e.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-500 focus:ring-brand-400"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-purple-300">Minimum AI Confidence Score</span>
                  <span className="font-bold text-white">{settings.minAiConfidence}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={settings.minAiConfidence}
                  onChange={(e) => setSettings((s) => ({ ...s, minAiConfidence: Number(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Reports with confidence below {settings.minAiConfidence}% will be tagged for manual supervisor review.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Map & Campus */}
      {activeTab === 'map' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin size={16} className="text-emerald-400" />
              Campus View Defaults
            </h3>
            <p className="text-xs text-slate-400">
              Default viewport settings for Marwadi University campus map.
            </p>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-medium text-slate-300">Default Zoom Level</label>
              <div className="grid grid-cols-4 gap-2">
                {[14, 15, 16, 17].map((zoom) => (
                  <button
                    key={zoom}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, defaultZoom: zoom }))}
                    className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                      settings.defaultZoom === zoom
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Level {zoom}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">Auto-center on Selected Bin</p>
                <p className="text-[11px] text-slate-400">Pans map smoothly when clicking a bin card or list item</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoCenterOnSelect}
                onChange={(e) => setSettings((s) => ({ ...s, autoCenterOnSelect: e.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-slate-800 text-brand-500 focus:ring-brand-400"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Info size={16} className="text-blue-400" />
              Campus Coordinates Anchor
            </h3>
            <p className="text-xs text-slate-400">
              Configured campus geofence center for telemetry validation.
            </p>

            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Campus:</span>
                <span className="font-semibold text-white">Marwadi University, Rajkot</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Latitude:</span>
                <span className="font-mono text-emerald-400">22.3676° N</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Longitude:</span>
                <span className="font-mono text-emerald-400">70.7976° E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tiles Provider:</span>
                <span className="text-slate-300">OpenStreetMap (Keyless Standard)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Diagnostics & Storage */}
      {activeTab === 'system' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Download size={16} className="text-cyan-400" />
              System Diagnostics Export
            </h3>
            <p className="text-xs text-slate-400">
              Download complete current platform state, active IoT telemetry, and configuration snapshot as a JSON file.
            </p>
            <button
              type="button"
              onClick={handleExportDiagnostics}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600/20 px-4 py-2.5 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/30 hover:bg-cyan-600/30 transition"
            >
              <Download size={14} />
              Export System Diagnostic JSON
            </button>
          </div>

          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.03] p-6 shadow-panel space-y-4">
            <h3 className="text-base font-semibold text-rose-300 flex items-center gap-2">
              <Trash2 size={16} />
              Local Storage Maintenance
            </h3>
            <p className="text-xs text-slate-400">
              Clears local cached filters, custom UI settings, and transient records without terminating your active login session.
            </p>
            <button
              type="button"
              onClick={handleClearCache}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
            >
              <Trash2 size={14} />
              Clear Local Storage Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
