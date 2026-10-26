function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <h3 className="text-2xl font-semibold text-white">Settings</h3>
        <p className="mt-2 text-sm text-slate-400">Configure the dashboard, notifications, and system preferences.</p>
      </div>
      <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
        <h4 className="text-lg font-semibold text-white">Application Preferences</h4>
        <p className="mt-3 text-sm text-slate-400">Theme and notification settings will go here.</p>
      </div>
    </div>
  );
}

export default SettingsPage;
