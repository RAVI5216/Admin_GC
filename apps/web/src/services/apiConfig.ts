export const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';

export const getAuthHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
  };
};
