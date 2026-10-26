import type { Task, TaskRequest, TaskStatus } from '../types/task';
import { API_BASE, getAuthHeaders } from './apiConfig';
import { dataCache } from './dataCache';

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
  const response = await fetch(`${API_BASE}/api/tasks`, {
    headers: getAuthHeaders(),
  });
  const data: Task[] = await handleResponse(response);
  if (Array.isArray(data)) {
    dataCache.setTasks(data);
  }
  return data;
};

export const createTask = async (payload: TaskRequest): Promise<Task> => {
  const response = await fetch(`${API_BASE}/api/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const created: Task = await handleResponse(response);
  if (created && created._id) {
    dataCache.addTask(created);
  }
  return created;
};

export const updateTaskStatus = async (id: string, status: TaskStatus): Promise<Task> => {
  const response = await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  const updated: Task = await handleResponse(response);
  if (updated && updated._id) {
    dataCache.updateTask(id, { status: updated.status, updatedAt: updated.updatedAt });
  }
  return updated;
};

export const deleteTask = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    await handleResponse(response);
  }
  dataCache.removeTask(id);
};
