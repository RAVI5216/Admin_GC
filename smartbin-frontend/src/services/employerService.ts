import type { Employer, EmployerRequest } from '../types/employer';

const API_BASE = 'http://localhost:5000';

const handleResponse = async (response: Response) => {
  const text = await response.text();
  if (!response.ok) {
    let errorMessage = 'Employer service error';
    try {
      const data = JSON.parse(text);
      errorMessage = data.error || data.message || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return text ? JSON.parse(text) : null;
};

export const fetchEmployers = async (): Promise<Employer[]> => {
  const response = await fetch(`${API_BASE}/employers`);
  return handleResponse(response);
};

export const createEmployer = async (payload: EmployerRequest): Promise<Employer> => {
  const response = await fetch(`${API_BASE}/employers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const updateEmployer = async (id: string, payload: EmployerRequest): Promise<Employer> => {
  const response = await fetch(`${API_BASE}/employers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const deleteEmployer = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/employers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    await handleResponse(response);
  }
};
