import type { ReportRecord } from './reportService';
import type { Task } from '../types/task';
import type { EmployerUser } from '../types/employer';

let reportsCache: ReportRecord[] | null = null;
let tasksCache: Task[] | null = null;
let employersCache: EmployerUser[] | null = null;

export const dataCache = {
  // Reports
  getReports: (): ReportRecord[] | null => reportsCache,
  setReports: (reports: ReportRecord[]) => {
    reportsCache = reports;
  },
  updateReport: (reportId: string, updates: Partial<ReportRecord>) => {
    if (reportsCache) {
      reportsCache = reportsCache.map((r) =>
        r.reportId === reportId ? { ...r, ...updates } : r
      );
    }
  },
  hasReports: (): boolean => reportsCache !== null,

  // Tasks
  getTasks: (): Task[] | null => tasksCache,
  setTasks: (tasks: Task[]) => {
    tasksCache = tasks;
  },
  addTask: (task: Task) => {
    if (tasksCache) {
      tasksCache = [task, ...tasksCache.filter((t) => t._id !== task._id)];
    } else {
      tasksCache = [task];
    }
  },
  updateTask: (taskId: string, updates: Partial<Task>) => {
    if (tasksCache) {
      tasksCache = tasksCache.map((t) =>
        t._id === taskId ? { ...t, ...updates } : t
      );
    }
  },
  removeTask: (taskId: string) => {
    if (tasksCache) {
      tasksCache = tasksCache.filter((t) => t._id !== taskId);
    }
  },
  hasTasks: (): boolean => tasksCache !== null,

  // Employers
  getEmployers: (): EmployerUser[] | null => employersCache,
  setEmployers: (employers: EmployerUser[]) => {
    employersCache = employers;
  },
  addEmployer: (employer: EmployerUser) => {
    if (employersCache) {
      employersCache = [...employersCache, employer];
    } else {
      employersCache = [employer];
    }
  },
  hasEmployers: (): boolean => employersCache !== null,

  // Clear all (e.g. on logout)
  clearAll: () => {
    reportsCache = null;
    tasksCache = null;
    employersCache = null;
  },
};
