export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'assigned'
  | 'unassigned';

export interface Task {
  _id: string;
  title: string;
  description: string;
  // Employee info
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  // Report info (optional)
  reportId: string | null;
  reportTitle: string | null;
  // Bin info (optional — bin-status-based assignments)
  binId: string | null;
  binLocation: string | null;
  binStatus: string | null;
  binFillLevel: number | null;
  // Metadata
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskRequest = Omit<Task, '_id' | 'createdAt' | 'updatedAt' | 'status'>;
