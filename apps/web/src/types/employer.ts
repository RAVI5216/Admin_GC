export type EmployerUser = Record<string, unknown> & {
  _id?: string;
  employerId?: string;
  userId?: string;
  name?: string;
  email?: string;
  employeeId?: string;
  phone?: string;
  role?: string;
  department?: string;
  status?: string;
  createdAt?: string;
  createdBy?: string;
};

export type Employer = EmployerUser;
