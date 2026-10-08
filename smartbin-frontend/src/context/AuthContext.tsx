import React, { createContext, useContext, useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000';

const readApiResponse = async (response: Response, fallback: string) => {
  const responseText = await response.text();
  let data: Record<string, unknown>;

  try {
    data = responseText ? JSON.parse(responseText) as Record<string, unknown> : {};
  } catch {
    if (responseText.trimStart().startsWith('<')) {
      throw new Error(
        'The backend returned an HTML page instead of an API response. Restart the backend so it loads the password reset routes.'
      );
    }
    throw new Error('The backend returned an invalid response. Check that the backend API is running.');
  }

  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : fallback);
  }

  return data;
};

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
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (email: string, code: string, password: string) => Promise<string>;
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
      const data = await readApiResponse(res, 'Login failed');
      if (typeof data.email !== 'string' || typeof data.name !== 'string') {
        throw new Error('The backend returned an invalid login response.');
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

  const requestPasswordReset = async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await readApiResponse(res, 'Unable to request a password reset');
    if (typeof data.message !== 'string') {
      throw new Error('The backend returned an invalid password reset response.');
    }
    return data.message;
  };

  const resetPassword = async (email: string, code: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });
    const data = await readApiResponse(res, 'Unable to reset password');
    if (typeof data.message !== 'string') {
      throw new Error('The backend returned an invalid password reset response.');
    }
    setSavedPassword(null);
    localStorage.removeItem('adminPassword');
    return data.message;
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
        requestPasswordReset,
        resetPassword,
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
