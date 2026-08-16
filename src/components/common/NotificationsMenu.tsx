import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Package, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Notification } from '../../types/database';

export function NotificationsMenu() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    } catch (err) {
      console.warn('Could not fetch notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Realtime subscription for customer notifications
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      console.warn('Error marking notifications read:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    setIsOpen(false);
    if (!notif.is_read) {
      try {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notif.id);
      } catch (err) {
        console.warn('Error marking notification read:', err);
      }
    }

    if (notif.order_id) {
      navigate(`/orders?orderId=${notif.order_id}`);
    } else {
      navigate('/orders');
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center rounded-full shadow-md ring-2 ring-white dark:ring-gray-900 animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 py-2 z-20 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-xs">
                    <p className="font-medium">No notifications yet</p>
                    <p className="mt-1 opacity-80">You'll receive order & return updates here.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left p-3.5 transition-colors flex gap-3 ${
                        notif.is_read
                          ? 'bg-white dark:bg-gray-800 opacity-80'
                          : 'bg-amber-50/50 dark:bg-amber-950/20 font-medium'
                      } hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                    >
                      <div className="mt-0.5">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                          <RotateCcw className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
