import React, { createContext, useContext, useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000';

type User = {
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  savedEmail: string | null;
  savedPassword: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  updateSavedEmail: (email: string) => void;
  updateSavedPassword: (password: string) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setUser({ name: data.name, email: data.email });
      setSavedEmail(data.email);
      setSavedPassword(password);
      localStorage.setItem('adminUser', JSON.stringify({ name: data.name, email: data.email }));
      localStorage.setItem('adminEmail', data.email);
      localStorage.setItem('adminPassword', password);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setSavedEmail(null);
    setSavedPassword(null);
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminPassword');
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('adminUser', JSON.stringify(updated));
    setSavedEmail(updated.email);
    localStorage.setItem('adminEmail', updated.email);
  };

  const updateSavedEmail = (email: string) => {
    setSavedEmail(email);
    localStorage.setItem('adminEmail', email);
  };

  const updateSavedPassword = (password: string) => {
    setSavedPassword(password);
    localStorage.setItem('adminPassword', password);
  };

  React.useEffect(() => {
    const stored = localStorage.getItem('adminUser');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    const storedEmail = localStorage.getItem('adminEmail');
    if (storedEmail) {
      setSavedEmail(storedEmail);
    }
    const storedPassword = localStorage.getItem('adminPassword');
    if (storedPassword) {
      setSavedPassword(storedPassword);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        savedEmail,
        savedPassword,
        login,
        logout,
        updateUser,
        updateSavedEmail,
        updateSavedPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
