import { useEffect, useState } from 'react';
import { API } from '../config/api';
import { BellIcon, CheckIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function PatientNotifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const [notifList, count] = await Promise.all([
        filter === 'unread' 
          ? API.notifications.getMyUnread('PATIENT')
          : API.notifications.getMyNotifications('PATIENT'),
        API.notifications.getMyUnreadCount('PATIENT')
      ]);
      setNotifications(Array.isArray(notifList) ? notifList : []);
      setUnreadCount(count || 0);
    } catch (e) {
      setError(e?.message || 'Unable to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await API.notifications.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.notifications.markAllAsRead('PATIENT');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await API.notifications.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const getNotificationTypeStyles = (type) => {
    switch (type) {
      case 'APPOINTMENT_APPROVED':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'APPOINTMENT_DECLINED':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'APPOINTMENT_CREATED':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="max-w-sm">
          <h1 className="text-3xl font-black text-[#182C61]">Notifications</h1>
          <p className="text-[#808e9b] mt-1 font-bold">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadNotifications}
            className="px-4 py-2 bg-[#182C61] text-white rounded-xl font-black text-sm hover:bg-[#182C61]/85"
          >
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            filter === 'all'
              ? 'bg-[#182C61] text-white'
              : 'bg-slate-100 text-[#808e9b] hover:bg-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            filter === 'unread'
              ? 'bg-[#182C61] text-white'
              : 'bg-slate-100 text-[#808e9b] hover:bg-slate-200'
          }`}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* Error Alert */}
      {error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <span className="text-sm font-semibold text-amber-800">{error}</span>
        </div>
      ) : null}

      {/* Notifications List */}
      <div className="bg-white border-2 border-slate-50 rounded-2xl p-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#182C61]"></div>
            <span className="ml-3 text-sm font-bold text-[#808e9b]">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BellIcon className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-[#808e9b]">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-[#808e9b] mt-1">
              {filter === 'unread' ? 'All your notifications have been read' : "You'll be notified about appointments and updates here"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all ${
                  notification.isRead
                    ? 'bg-slate-50 border-slate-100'
                    : 'bg-white border-2 border-[#182C61]/20 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${getNotificationTypeStyles(notification.notificationType)}`}>
                        {notification.notificationType?.replace(/_/g, ' ') || 'NOTIFICATION'}
                      </span>
                      {!notification.isRead && (
                        <span className="flex h-2 w-2 rounded-full bg-[#eb2f06] animate-pulse"></span>
                      )}
                    </div>
                    
                    {/* Message */}
                    <p className={`text-sm ${notification.isRead ? 'text-[#808e9b]' : 'text-[#182C61] font-bold'}`}>
                      {notification.message}
                    </p>
                    
                    {/* Timestamp */}
                    <p className="text-xs text-[#808e9b] mt-2">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                        title="Mark as read"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
