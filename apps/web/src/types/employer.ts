export type EmployerUser = Record<string, unknown> & {
  employerId?: string;
  userId?: string;
  name?: string;
  email?: string;
  employeeId?: string;
  phone?: string;
  role?: string;
  department?: string;
  createdAt?: string;
  createdBy?: string;
};
