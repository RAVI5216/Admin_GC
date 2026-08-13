import React, { createContext, useContext, useEffect, useState } from 'react';

type Profile = {
  collectorName: string;
  role: string;
  email: string;
  phone: string;
  avatar?: string | null;
};

const API_BASE = 'http://localhost:5000';

type ProfileUpdatePayload = Partial<Profile> & { password?: string | null };

const ProfileContext = createContext<{
  profile: Profile | null;
  loading: boolean;
  updateProfile: (p: ProfileUpdatePayload) => Promise<Profile>;
  refresh: () => Promise<void>;
} | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      // ignore - keep null
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener('profile-updated', onUpdate);
    return () => window.removeEventListener('profile-updated', onUpdate);
  }, []);

  const updateProfile = async (p: ProfileUpdatePayload) => {
    const body: Record<string, unknown> = {
      collectorName: p.collectorName ?? profile?.collectorName ?? '',
      role: p.role ?? profile?.role ?? '',
      email: p.email ?? profile?.email ?? '',
      phone: p.phone ?? profile?.phone ?? '',
      avatar: p.avatar ?? profile?.avatar ?? null,
    };
    if (p.password) {
      body.password = p.password;
    }

    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      let errorMessage = 'Failed to update profile';
      try {
        const json = JSON.parse(text);
        errorMessage = json.error || json.message || text || errorMessage;
      } catch {
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }
    const updated = text ? JSON.parse(text) : body;
    setProfile(updated);
    // emit an event for other parts of the app
    window.dispatchEvent(new Event('profile-updated'));
    return updated;
  };

  return <ProfileContext.Provider value={{ profile, loading, updateProfile, refresh: load }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}

export default ProfileContext;
