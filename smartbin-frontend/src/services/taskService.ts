import type { Task, TaskRequest, TaskStatus } from '../types/task';

const API_BASE = 'http://localhost:5000';

const handleResponse = async (response: Response) => {
  const text = await response.text();
  if (!response.ok) {
    let errorMessage = 'Task service error';
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

export const fetchTasks = async (): Promise<Task[]> => {
  const response = await fetch(`${API_BASE}/tasks`);
  return handleResponse(response);
};

export const createTask = async (payload: TaskRequest): Promise<Task> => {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const updateTaskStatus = async (id: string, status: TaskStatus): Promise<Task> => {
  const response = await fetch(`${API_BASE}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
};

export const deleteTask = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    await handleResponse(response);
  }
};
