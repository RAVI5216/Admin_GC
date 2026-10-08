import type { EmployerUser } from '../types/employer';

const API_BASE = 'http://localhost:5000';

const handleResponse = async (response: Response, serviceName: string, endpoint: string) => {
  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        `The ${serviceName} API route is unavailable. Restart the updated backend so ${endpoint} is registered.`
      );
    }
    throw new Error(`The ${serviceName} API returned an invalid response.`);
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `${serviceName} service error`;
    throw new Error(errorMessage);
  }
  return data;
};

export const fetchEmployers = async (): Promise<EmployerUser[]> => {
  const response = await fetch(`${API_BASE}/api/employers`);
  const data: unknown = await handleResponse(response, 'Employers', 'GET /api/employers');
  if (!Array.isArray(data)) {
    throw new Error('Employer service returned an invalid response');
  }
  const isEmployerUser = (item: unknown): item is EmployerUser =>
    typeof item === 'object' &&
    item !== null &&
    !Array.isArray(item);
  if (!data.every(isEmployerUser)) {
    throw new Error('Employer service returned an invalid user record');
  }
  return data;
};

export type CreateEmployerInput = {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  password: string;
};

export type EmployerIds = {
  userId: string;
  employeeId: string;
};

export const generateEmployerIds = async (): Promise<EmployerIds> => {
  const response = await fetch(`${API_BASE}/api/employers/ids`, { method: 'POST' });
  const data: unknown = await handleResponse(response, 'Employers', 'POST /api/employers/ids');
  if (
    typeof data !== 'object' ||
    data === null ||
    !('userId' in data) ||
    typeof data.userId !== 'string' ||
    !data.userId.startsWith('EMP-') ||
    !('employeeId' in data) ||
    typeof data.employeeId !== 'string' ||
    !data.employeeId.startsWith('EMP-') ||
    data.userId.toUpperCase() === data.employeeId.toUpperCase()
  ) {
    throw new Error('Employer service returned invalid generated IDs');
  }
  return { userId: data.userId, employeeId: data.employeeId };
};

export const createEmployer = async (employer: CreateEmployerInput): Promise<EmployerUser> => {
  const response = await fetch(`${API_BASE}/api/employers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employer),
  });
  const data: unknown = await handleResponse(response, 'Employers', 'POST /api/employers');
  if (
    typeof data !== 'object' ||
    data === null ||
    !('userId' in data) ||
    typeof data.userId !== 'string' ||
    !('employeeId' in data) ||
    typeof data.employeeId !== 'string' ||
    !('name' in data) ||
    typeof data.name !== 'string' ||
    !('email' in data) ||
    typeof data.email !== 'string' ||
    !('role' in data) ||
    data.role !== 'employee'
  ) {
    throw new Error('Employer service returned an invalid user record');
  }
  return data as EmployerUser;
};

export type CreateEmployerTaskInput = {
  assignedUserId: string;
  reportId: string;
};

export type EmployerTask = {
  taskID: string;
  assignedUserId: string;
  reportId: string;
  taskName: string;
  description: string;
  status: string;
  createdAt: string;
  reportStatus: string;
};

export const createEmployerTask = async (
  task: CreateEmployerTaskInput
): Promise<EmployerTask> => {
  const response = await fetch(`${API_BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  const data: unknown = await handleResponse(response, 'Task assignment', 'POST /api/tasks');
  if (
    typeof data !== 'object' ||
    data === null ||
    !('taskID' in data) ||
    typeof data.taskID !== 'string' ||
    !('reportId' in data) ||
    typeof data.reportId !== 'string' ||
    !('assignedUserId' in data) ||
    typeof data.assignedUserId !== 'string' ||
    !('taskName' in data) ||
    typeof data.taskName !== 'string' ||
    !('description' in data) ||
    typeof data.description !== 'string' ||
    !('status' in data) ||
    typeof data.status !== 'string' ||
    !('createdAt' in data) ||
    typeof data.createdAt !== 'string' ||
    !('reportStatus' in data) ||
    typeof data.reportStatus !== 'string'
  ) {
    throw new Error('Task service returned an invalid response');
  }
  return {
    taskID: data.taskID,
    reportId: data.reportId,
    assignedUserId: data.assignedUserId,
    taskName: data.taskName,
    description: data.description,
    status: data.status,
    createdAt: data.createdAt,
    reportStatus: data.reportStatus,
  };
};
