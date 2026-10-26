import type { SmartBinData } from '../types/smartbin';
import { API_BASE, getAuthHeaders } from './apiConfig';

const handleResponse = async (response: Response, endpoint: string) => {
  const text = await response.text();
  if (!response.ok) {
    let message = `Bin service error at ${endpoint}`;
    try {
      const data = JSON.parse(text);
      message = data.error || data.message || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }
  return text ? JSON.parse(text) : null;
};

export const fetchAllBins = async (): Promise<SmartBinData[]> => {
  const response = await fetch(`${API_BASE}/api/bins`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response, 'GET /api/bins');
};

export const fetchBinById = async (id: string): Promise<SmartBinData> => {
  const response = await fetch(`${API_BASE}/api/bins/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response, `GET /api/bins/${id}`);
};
