const API_BASE = 'http://localhost:5000';

export type NotificationRecord = {
  _id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  solved: boolean;
  problemSolved: boolean;
  time: string;
  deviceId: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  const response = await fetch(`${API_BASE}/notifications`);
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
}

export async function updateNotificationStatus(
  id: string,
  updates: Partial<Pick<NotificationRecord, 'solved' | 'problemSolved'>>
): Promise<NotificationRecord> {
  const response = await fetch(`${API_BASE}/notifications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to update notification status');
  }
  return response.json();
}
