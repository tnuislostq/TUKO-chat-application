import React, { useState, useEffect } from "react";
import { Bell, CheckCheck, Trash2, UserPlus, PhoneMissed, MessageSquare } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function NotificationsView() {
  const { setUnreadNotifications } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      const unread = (res.notifications || []).filter((n) => !n.read).length;
      setUnreadNotifications(unread);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotifications(0);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClear = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
      setUnreadNotifications(0);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    if (type === "friend_request") return <UserPlus className="w-5 h-5 text-brand-500" />;
    if (type === "call_missed") return <PhoneMissed className="w-5 h-5 text-rose-500" />;
    return <MessageSquare className="w-5 h-5 text-brand-500" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-navy-950 transition-colors overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-navy-800/80 px-6 flex items-center justify-between bg-white dark:bg-navy-900 shrink-0">
        <div className="flex items-center space-x-2 font-bold text-sm text-slate-800 dark:text-slate-100">
          <Bell className="w-5 h-5 text-brand-500" />
          <span>Notifications</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-750 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-3xl mx-auto w-full space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400 bg-white dark:bg-navy-900 rounded-3xl border border-slate-200 dark:border-navy-800">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>You have no notifications right now.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && handleMarkOne(n.id)}
              className={`flex items-start space-x-3.5 p-4 rounded-2xl border transition-all cursor-pointer ${
                n.read
                  ? "bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-800 opacity-70"
                  : "bg-brand-50/50 dark:bg-navy-850 border-brand-500/30 shadow-sm"
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-navy-800 shrink-0">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {n.body}
                </p>
              </div>
              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0 mt-1" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
