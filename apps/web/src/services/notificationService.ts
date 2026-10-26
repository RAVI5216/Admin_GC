import { API_BASE, getAuthHeaders } from './apiConfig';

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
  const response = await fetch(`${API_BASE}/notifications`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
}

export async function updateNotificationStatus(
  id: string,
  updates: Partial<Pick<NotificationRecord, 'solved' | 'problemSolved'>>
): Promise<NotificationRecord> {
  const response = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to update notification status');
  }
  return response.json();
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/mark-all-read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to mark all notifications as read');
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Failed to delete notification');
  }
}
