import React, { createContext, useContext, useState } from 'react';
import { API_BASE } from '../services/apiConfig';
import { dataCache } from '../services/dataCache';

const readApiResponse = async (response: Response, fallback: string) => {
  const responseText = await response.text();
  let data: Record<string, unknown>;

  try {
    data = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
  } catch {
    if (responseText.trimStart().startsWith('<')) {
      throw new Error(
        'The backend returned an HTML page instead of an API response. Restart the backend so it loads the authentication routes.'
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

type LoginChallenge = {
  email: string;
  message: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  savedEmail: string | null;
  savedPassword: null;
  login: (email: string, password: string) => Promise<LoginChallenge>;
  verifyLoginOtp: (email: string, code: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (email: string, code: string, password: string) => Promise<string>;
  logout: () => void;
  updateUser: (user: User) => void;
  updateToken: (token: string) => void;
  updateSavedEmail: (email: string) => void;
  updateSavedPassword: (password: string) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronous lazy state initialization from localStorage prevents redirect loops
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('adminUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('adminToken');
  });

  const [loading, setLoading] = useState(false);

  const [savedEmail, setSavedEmail] = useState<string | null>(() => {
    return localStorage.getItem('adminEmail');
  });

  // Remove any legacy insecure plain text passwords from localStorage
  React.useEffect(() => {
    if (localStorage.getItem('adminPassword')) {
      localStorage.removeItem('adminPassword');
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await readApiResponse(res, 'Login failed');
      if (data.otpRequired !== true || typeof data.email !== 'string' || typeof data.message !== 'string') {
        throw new Error('The backend returned an invalid login response.');
      }
      return { email: data.email, message: data.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async (email: string, code: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await readApiResponse(res, 'Login verification failed');
      if (typeof data.email !== 'string' || typeof data.name !== 'string' || typeof data.token !== 'string') {
        throw new Error('The backend returned an invalid login verification response.');
      }
      const userObj = { name: data.name, email: data.email };
      setUser(userObj);
      setToken(data.token);
      setSavedEmail(data.email);
      localStorage.setItem('adminUser', JSON.stringify(userObj));
      localStorage.setItem('adminEmail', data.email);
      localStorage.setItem('adminToken', data.token);
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
    return data.message;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSavedEmail(null);
    dataCache.clearAll();
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminPassword');
    localStorage.removeItem('adminToken');
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('adminUser', JSON.stringify(updated));
    setSavedEmail(updated.email);
    localStorage.setItem('adminEmail', updated.email);
  };

  const updateToken = (updatedToken: string) => {
    setToken(updatedToken);
    localStorage.setItem('adminToken', updatedToken);
  };

  const updateSavedEmail = (email: string) => {
    setSavedEmail(email);
    localStorage.setItem('adminEmail', email);
  };

  // Deprecated dummy method to maintain API contract without storing raw password
  const updateSavedPassword = () => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        savedEmail,
        savedPassword: null,
        login,
        verifyLoginOtp,
        requestPasswordReset,
        resetPassword,
        logout,
        updateUser,
        updateToken,
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
