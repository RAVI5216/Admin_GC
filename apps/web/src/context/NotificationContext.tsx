import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  fetchNotifications,
  updateNotificationStatus,
  markAllNotificationsAsRead,
  deleteNotification as apiDeleteNotification,
  NotificationRecord,
} from '../services/notificationService';

const NotificationContext = createContext<{
  notifications: NotificationRecord[];
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsSolved: (id: string) => Promise<void>;
  markProblemSolved: (id: string) => Promise<void>;
  markAllAsSolved: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
} | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (notifications.length === 0) {
      setLoading(true);
    }
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Unable to load notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsSolved = async (id: string) => {
    const updated = await updateNotificationStatus(id, { solved: true });
    setNotifications((current) => current.map((item) => (item._id === id ? updated : item)));
  };

  const markProblemSolved = async (id: string) => {
    const updated = await updateNotificationStatus(id, { problemSolved: true });
    setNotifications((current) => current.map((item) => (item._id === id ? updated : item)));
  };

  const markAllAsSolved = async () => {
    await markAllNotificationsAsRead();
    setNotifications((current) => current.map((item) => ({ ...item, solved: true })));
  };

  const deleteNotification = async (id: string) => {
    await apiDeleteNotification(id);
    setNotifications((current) => current.filter((item) => item._id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        refreshNotifications: loadNotifications,
        markAsSolved,
        markProblemSolved,
        markAllAsSolved,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
