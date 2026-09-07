import React, { useEffect, useState } from 'react';
import { NotificationItem } from '../types';
import { api } from '../lib/api';
import { Bell, CheckCircle2, XCircle, AlertCircle, Clock, CheckCheck, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshUnread: () => void;
}

export const NotificationDrawer: React.FC<Props> = ({ isOpen, onClose, onRefreshUnread }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      onRefreshUnread();
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      onRefreshUnread();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onRefreshUnread();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="notification-drawer-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div id="notification-drawer" className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800 text-lg">Notifications</h2>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              {notifications.filter((n) => !n.isRead).length} Unread
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                id="btn-mark-all-read"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Read All</span>
              </button>
            )}
            <button
              id="btn-close-notif-drawer"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-slate-400">Updates regarding your bookings will appear here.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-white border-slate-200 text-slate-600'
                    : 'bg-indigo-50/70 border-indigo-200 text-slate-800 shadow-xs'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 shrink-0">
                    {n.type === 'APPROVAL' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : n.type === 'REJECTION' ? (
                      <XCircle className="w-5 h-5 text-rose-600" />
                    ) : n.type === 'REQUEST_CREATED' ? (
                      <Clock className="w-5 h-5 text-amber-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900">{n.title}</p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
