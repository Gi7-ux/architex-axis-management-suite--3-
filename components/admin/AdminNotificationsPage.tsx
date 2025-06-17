import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Notification,
    fetchAdminNotificationsAPI,
    markNotificationAsReadAPI,
    markAllAdminNotificationsAsReadAPI,
    FetchAdminNotificationsParams,
    ApiError
} from '../../apiService';
import { useAuth } from '../AuthContext';
import Button from '../shared/Button';
import LoadingSpinner from '../shared/LoadingSpinner';
import { CheckCircleIcon, EyeIcon, EnvelopeOpenIcon } from '../shared/IconComponents';
import { NAV_LINKS } from '../../constants';


const AdminNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Basic pagination state (can be enhanced later)
  const [currentPage, setCurrentPage] = useState(0); // Offset based
  const notificationsPerPage = 15;

  const loadNotifications = useCallback(async (pageToLoad: number = 0) => {
    if (user?.role !== 'admin') {
      setError("Access denied."); setIsLoading(false); return;
    }
    setIsLoading(true); setError(null);
    try {
      const params: FetchAdminNotificationsParams = {
        limit: notificationsPerPage,
        offset: pageToLoad * notificationsPerPage,
      };
      const response = await fetchAdminNotificationsAPI(params);
      setNotifications(response.notifications);
      setTotalUnread(response.total_unread); // Backend provides this
      // For more sophisticated pagination, backend might return total_pages or total_items
    } catch (err: any) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [user, notificationsPerPage]);

  useEffect(() => {
    loadNotifications(currentPage);
  }, [loadNotifications, currentPage]);

  const handleMarkAsRead = async (notificationId: number | string) => {
    try {
      await markNotificationAsReadAPI(notificationId);
      // Refresh or update local state
      // For simplicity, just update local 'is_read' and decrement unread count
      setNotifications(prev => prev.map(n => n.id === notificationId ? {...n, is_read: true} : n));
      setTotalUnread(prev => Math.max(0, prev - 1)); // Decrement, ensure not negative
      // Ideally, re-fetch or get precise unread count from API response if it differs from just one.
    } catch (err: any) {
      alert("Failed to mark as read: " + (err.message || "Unknown error"));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllAdminNotificationsAsReadAPI();
      alert(response.message);
      loadNotifications(0); // Refresh and go to first page
      setCurrentPage(0);
    } catch (err: any) {
      alert("Failed to mark all as read: " + (err.message || "Unknown error"));
    }
  };

  const getRelatedLink = (notification: Notification): string | null => {
    if (!notification.related_entity_type || notification.related_entity_id === null) return null;
    switch (notification.related_entity_type) {
      case 'user':
        return `${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_USERS}`; // Needs to link to specific user if possible
      case 'project':
        return NAV_LINKS.PROJECT_DETAILS.replace(':id', String(notification.related_entity_id));
      case 'application':
        // Need a page for viewing a single application, or link to project and highlight application
        // For now, link to project of the application
        // This would require fetching application details to get project_id if not directly available
        return null; // Placeholder - requires more info
      default:
        return null;
    }
  };

  const getNotificationMessage = (notification: Notification): string => {
      // This can be expanded with a dictionary or more complex logic for i18n
      switch(notification.message_key) {
          case 'new_user_registered':
              return `New user registered (ID: ${notification.related_entity_id}).`;
          case 'project_awaits_approval':
              return `Project (ID: ${notification.related_entity_id}) is awaiting approval.`;
          case 'application_submitted':
              return `New application submitted (ID: ${notification.related_entity_id}).`;
          default:
              return notification.message_key.replace(/_/g, ' '); // Default formatting
      }
  }

  if (isLoading) return <LoadingSpinner text="Loading notifications..." className="p-6" />;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md">{error}</div>;

  return (
    <div className="p-4 md:p-6 bg-white shadow-xl rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-primary">Admin Notifications ({totalUnread} unread)</h2>
        {notifications.length > 0 && totalUnread > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="secondary" size="sm" leftIcon={<EnvelopeOpenIcon />}>
            Mark All As Read
          </Button>
        )}
      </div>

      {notifications.length === 0 && <p className="text-gray-500">No notifications found.</p>}

      <ul className="space-y-3">
        {notifications.map(notif => (
          <li key={notif.id}
              className={`p-3 rounded-md border flex items-start justify-between gap-2
                          ${notif.is_read ? 'bg-gray-50 opacity-70' : 'bg-blue-50 border-blue-200'}`}>
            <div>
              <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                {getNotificationMessage(notif)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(notif.created_at).toLocaleString()}</p>
            </div>
            <div className="flex-shrink-0 space-x-1">
              {getRelatedLink(notif) && (
                <Link to={getRelatedLink(notif)!}>
                  <Button variant="ghost" size="xs" className="p-1" title="View Details"><EyeIcon className="w-4 h-4"/></Button>
                </Link>
              )}
              {!notif.is_read && (
                <Button variant="ghost" size="xs" onClick={() => handleMarkAsRead(notif.id)} className="p-1" title="Mark as Read">
                  <CheckCircleIcon className="w-4 h-4 text-green-500"/>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {/* Basic Pagination (can be improved) */}
      <div className="mt-6 flex justify-between items-center">
        <Button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0 || isLoading}>Previous</Button>
        <span className="text-sm text-gray-700">Page {currentPage + 1}</span>
        <Button onClick={() => setCurrentPage(p => p + 1)} disabled={notifications.length < notificationsPerPage || isLoading}>Next</Button>
      </div>
    </div>
  );
};
export default AdminNotificationsPage;
