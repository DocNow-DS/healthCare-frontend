import { useEffect, useState } from 'react';
import { API } from '../config/api';
import { 
  BellIcon, 
  CheckIcon, 
  TrashIcon, 
  ExclamationTriangleIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  XCircleIcon,
  ChevronRightIcon,
  FunnelIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function DoctorNotifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [markingRead, setMarkingRead] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const [notifList, count] = await Promise.all([
        filter === 'unread' 
          ? API.notifications.getMyUnread('DOCTOR')
          : API.notifications.getMyNotifications('DOCTOR'),
        API.notifications.getMyUnreadCount('DOCTOR')
      ]);
      setNotifications(Array.isArray(notifList) ? notifList : []);
      setUnreadCount(count || 0);
    } catch (e) {
      setError(e?.message || 'Unable to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
  };

  const handleMarkAsRead = async (notificationId) => {
    setMarkingRead(notificationId);
    try {
      await API.notifications.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    } finally {
      setMarkingRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.notifications.markAllAsRead('DOCTOR');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const handleDelete = async (notificationId) => {
    setDeleting(notificationId);
    try {
      await API.notifications.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const wasUnread = notifications.find(n => n.id === notificationId)?.isRead === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Failed to delete notification:', e);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'APPOINTMENT_APPROVED':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'APPOINTMENT_DECLINED':
        return <XCircleIcon className="h-5 w-5" />;
      case 'APPOINTMENT_CREATED':
        return <CalendarIcon className="h-5 w-5" />;
      case 'APPOINTMENT_CANCELLED':
        return <XCircleIcon className="h-5 w-5" />;
      case 'CONSULTATION_REQUEST':
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />;
      case 'BILLING_REQUEST':
        return <CurrencyDollarIcon className="h-5 w-5" />;
      case 'PAYMENT_COMPLETED':
        return <CheckCircleIcon className="h-5 w-5" />;
      default:
        return <BellIcon className="h-5 w-5" />;
    }
  };

  const getNotificationTypeStyles = (type) => {
    switch (type) {
      case 'APPOINTMENT_APPROVED':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'APPOINTMENT_DECLINED':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'APPOINTMENT_CREATED':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'APPOINTMENT_CANCELLED':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'CONSULTATION_REQUEST':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'BILLING_REQUEST':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'PAYMENT_COMPLETED':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getNotificationTypeLabel = (type) => {
    return type?.replace(/_/g, ' ') || 'NOTIFICATION';
  };

  const getPriorityBadge = (type) => {
    const highPriority = ['CONSULTATION_REQUEST', 'APPOINTMENT_CREATED', 'BILLING_REQUEST'];
    if (highPriority.includes(type)) {
      return (
        <span className="px-2 py-0.5 bg-[#eb2f06]/10 text-[#eb2f06] rounded-full text-[10px] font-black uppercase tracking-wider border border-[#eb2f06]/20">
          Priority
        </span>
      );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header with professional styling */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#182C61]/5 to-transparent rounded-3xl -z-10"></div>
        <div className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#182C61]/10 rounded-xl">
                <BellAlertIcon className="h-7 w-7 text-[#182C61]" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-[#182C61] tracking-tight">
                  Notifications
                </h1>
                <p className="text-xs font-medium text-[#808e9b] mt-0.5">Doctor Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-14">
              {unreadCount > 0 ? (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-[#eb2f06] animate-pulse"></span>
                  <p className="text-[#808e9b] font-semibold">
                    <span className="font-black text-[#182C61]">{unreadCount}</span> unread notification{unreadCount > 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <p className="text-[#808e9b] font-semibold">All caught up!</p>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="group relative px-5 py-2.5 bg-white border-2 border-[#182C61]/20 text-[#182C61] rounded-xl font-bold text-sm hover:border-[#182C61]/40 hover:bg-[#182C61]/5 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <svg 
                  className={`h-4 w-4 transition-transform duration-300 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
            
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-sm hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-600/20 transition-all duration-200 hover:shadow-xl hover:shadow-green-600/30 active:scale-95"
              >
                <span className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4" />
                  Mark All Read
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Filter Tabs */}
      <div className="px-6">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit">
          <div className="flex items-center gap-1 text-[#808e9b] px-2">
            <FunnelIcon className="h-4 w-4" />
            <span className="text-xs font-bold">Filter:</span>
          </div>
          <button
            onClick={() => setFilter('all')}
            className={`relative px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
              filter === 'all'
                ? 'bg-white text-[#182C61] shadow-md'
                : 'text-[#808e9b] hover:bg-white/50 hover:text-[#182C61]'
            }`}
          >
            <span className="flex items-center gap-2">
              <BellIcon className="h-4 w-4" />
              All Notifications
            </span>
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`relative px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
              filter === 'unread'
                ? 'bg-white text-[#182C61] shadow-md'
                : 'text-[#808e9b] hover:bg-white/50 hover:text-[#182C61]'
            }`}
          >
            <span className="flex items-center gap-2">
              <div className="relative">
                <BellAlertIcon className="h-4 w-4" />
                {unreadCount > 0 && filter !== 'unread' && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#eb2f06] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#eb2f06]"></span>
                  </span>
                )}
              </div>
              Unread
              {unreadCount > 0 && (
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${
                  filter === 'unread' 
                    ? 'bg-[#182C61] text-white' 
                    : 'bg-[#eb2f06] text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Enhanced Error Alert */}
      {error && (
        <div className="mx-6 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-amber-50/95 backdrop-blur-sm border-l-4 border-amber-500 rounded-r-xl p-4 flex items-start gap-3 shadow-lg">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">{error}</p>
              <p className="text-xs text-amber-600 mt-0.5">Please try refreshing the page</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Summary Cards */}
      {!loading && notifications.length > 0 && (
        <div className="px-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-200">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">Appointments</span>
              </div>
              <p className="text-lg font-black text-blue-800 mt-1">
                {notifications.filter(n => n.notificationType?.includes('APPOINTMENT')).length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-3 border border-purple-200">
              <div className="flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-700">Consultations</span>
              </div>
              <p className="text-lg font-black text-purple-800 mt-1">
                {notifications.filter(n => n.notificationType === 'CONSULTATION_REQUEST').length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-200">
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">Billing</span>
              </div>
              <p className="text-lg font-black text-emerald-800 mt-1">
                {notifications.filter(n => n.notificationType?.includes('BILLING') || n.notificationType?.includes('PAYMENT')).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Notifications List */}
      <div className="px-6 pb-6">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-3 border-slate-200 border-t-[#182C61]"></div>
                <BellIcon className="absolute inset-0 m-auto h-5 w-5 text-[#182C61]/30" />
              </div>
              <span className="mt-4 text-sm font-bold text-[#808e9b]">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#182C61]/5 rounded-full blur-2xl"></div>
                <div className="relative p-6 bg-slate-50 rounded-full">
                  <BellIcon className="h-16 w-16 text-[#182C61]/20" />
                </div>
              </div>
              <h3 className="text-lg font-black text-[#182C61] mb-1">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-sm font-medium text-[#808e9b] max-w-sm">
                {filter === 'unread' 
                  ? 'All your notifications have been read. Stay tuned for updates!' 
                  : "You'll be notified about appointments, consultation requests, billing, and other important updates here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`group relative transition-all duration-300 hover:bg-slate-50/80 ${
                    !notification.isRead ? 'bg-gradient-to-r from-[#182C61]/5 to-transparent' : ''
                  }`}
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  {/* Unread indicator bar */}
                  {!notification.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#182C61] rounded-r-full"></div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon Container */}
                      <div className={`flex-shrink-0 p-2.5 rounded-xl border ${getNotificationTypeStyles(notification.notificationType)}`}>
                        {getNotificationIcon(notification.notificationType)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getNotificationTypeStyles(notification.notificationType)}`}>
                            {getNotificationTypeLabel(notification.notificationType)}
                          </span>
                          {!notification.isRead && (
                            <span className="px-2 py-0.5 bg-[#eb2f06]/10 text-[#eb2f06] rounded-full text-[10px] font-black uppercase tracking-wider border border-[#eb2f06]/20">
                              New
                            </span>
                          )}
                          {getPriorityBadge(notification.notificationType)}
                        </div>
                        
                        <p className={`text-sm leading-relaxed ${notification.isRead ? 'text-[#808e9b]' : 'text-[#182C61] font-bold'}`}>
                          {notification.message}
                        </p>
                        
                        {/* Additional metadata for doctor-specific notifications */}
                        {notification.metadata && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            {notification.metadata.patientName && (
                              <div className="flex items-center gap-2 text-xs">
                                <UserGroupIcon className="h-3.5 w-3.5 text-[#808e9b]" />
                                <span className="font-medium text-[#182C61]">Patient: {notification.metadata.patientName}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-1.5 text-xs text-[#808e9b]">
                            <ClockIcon className="h-3.5 w-3.5" />
                            <span className="font-medium">{formatDate(notification.createdAt)}</span>
                          </div>
                          
                          {/* Quick action hint */}
                          {!notification.isRead && (
                            <div className="flex items-center gap-1 text-xs text-[#182C61]/60">
                              <ChevronRightIcon className="h-3 w-3" />
                              <span className="font-medium">Click to view details</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markingRead === notification.id}
                            className="p-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                            title="Mark as read"
                          >
                            {markingRead === notification.id ? (
                              <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <CheckIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          disabled={deleting === notification.id}
                          className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                          title="Delete"
                        >
                          {deleting === notification.id ? (
                            <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}