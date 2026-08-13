import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchNotifications, updateNotificationStatus, NotificationRecord } from '../services/notificationService';

const NotificationContext = createContext<{
  notifications: NotificationRecord[];
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsSolved: (id: string) => Promise<void>;
  markProblemSolved: (id: string) => Promise<void>;
} | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
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

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        refreshNotifications: loadNotifications,
        markAsSolved,
        markProblemSolved,
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
