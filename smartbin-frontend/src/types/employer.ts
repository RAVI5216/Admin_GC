export type EmployerStatus = 'available' | 'assigned' | 'off-duty';

export type EmployerRole = typeof employerRoles[number];

export interface Employer {
  _id: string;
  name: string;
  role: EmployerRole;
  email: string;
  phone: string;
  location?: string;
  status: EmployerStatus;
  notes?: string;
  lastActive: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EmployerRequest = Omit<Employer, '_id' | 'createdAt' | 'updatedAt' | 'lastActive'> & {
  lastActive?: string;
};

export const employerRoles = [
  'Waste Collector',
  'Sanitation Worker',
  'Waste Segregation Worker',
  'Recycling Plant Operator',
  'Driver',
  'Waste Management Technician',
  'Environmental Technician',
] as const;

export const employerStatusOptions: EmployerStatus[] = ['available', 'assigned', 'off-duty'];
