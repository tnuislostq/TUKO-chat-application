import React from "react";
import {
  Home,
  MessageSquare,
  Users,
  Phone,
  Compass,
  Bell,
  Settings,
  Sun,
  Moon,
  LogOut
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import TukoLogo from "./TukoLogo";

export default function Rail({ activeTab, setActiveTab, onOpenSettings, onOpenSearch, onOpenProfile }) {
  const { user, logout, unreadNotifications } = useAuth();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "dms", label: "Direct Messages", icon: MessageSquare },
    { id: "friends", label: "Friends & Connections", icon: Users },
    { id: "calls", label: "Voice & Video Calls", icon: Phone },
    { id: "communities", label: "Communities", icon: Compass },
  ];

  const presenceColors = {
    online: "bg-emerald-500",
    idle: "bg-amber-500",
    dnd: "bg-rose-500",
    offline: "bg-slate-400"
  };

  return (
    <aside className="w-16 md:w-[72px] h-full bg-slate-100 dark:bg-navy-950 border-r border-slate-200 dark:border-navy-800/80 flex flex-col items-center py-4 select-none z-30 shrink-0 justify-between transition-colors">
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={() => setActiveTab("home")}
          className="relative group p-1.5 rounded-2xl hover:scale-105 active:scale-95 transition-all"
          title="Tuko Chat"
        >
          <TukoLogo className="w-10 h-10" />
          <span className="absolute left-20 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            Tuko Chat
          </span>
        </button>

        <div className="w-8 h-[2px] bg-slate-200 dark:bg-navy-800 rounded-full" />

        {/* Primary Navigation Rail Items */}
        <nav className="flex flex-col items-center space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-brand-600 text-white shadow-glow rounded-xl"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-navy-850 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5" />
                </button>

                {/* Left Active Indicator Pill */}
                {isActive && (
                  <span className="absolute -left-2 md:-left-2.5 top-2 bottom-2 w-1 bg-brand-500 rounded-r-full" />
                )}

                {/* Tooltip */}
                <span className="absolute left-16 bg-slate-900 dark:bg-navy-750 text-white text-xs px-2.5 py-1 rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center space-y-3">
        {/* Notifications Button */}
        <div className="relative group">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative ${
              activeTab === "notifications"
                ? "bg-brand-600 text-white"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-navy-850"
            }`}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-navy-950 animate-pulse" />
            )}
          </button>
          <span className="absolute left-16 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            Notifications ({unreadNotifications})
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-navy-850 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-navy-850 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
          title="App Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-8 h-[1px] bg-slate-200 dark:bg-navy-800" />

        {/* User Profile Avatar with Presence Indicator */}
        {user && (
          <div className="relative group">
            <button
              onClick={onOpenProfile}
              className="relative rounded-full p-0.5 hover:ring-2 hover:ring-brand-500 transition-all"
            >
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                alt={user.display_name}
                className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-navy-800"
              />
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-navy-950 ${
                  presenceColors[user.presence] || presenceColors.online
                }`}
              />
            </button>
            <span className="absolute left-16 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
              {user.display_name} (@{user.username})
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
