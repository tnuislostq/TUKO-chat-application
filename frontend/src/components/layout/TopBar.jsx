import React, { useState } from "react";
import { Search, Menu, Volume2, Mic, MicOff, PhoneOff, ChevronDown, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import { useSocket } from "../../context/SocketContext";

export default function TopBar({ onOpenSearch, onToggleMobileSidebar, currentViewTitle = "Tuko Chat" }) {
  const { user, updateProfile } = useAuth();
  const { activeVoiceRoom, leaveVoiceRoom, isVoiceRoomMuted, toggleVoiceRoomMic } = useCall();
  const { sendWS } = useSocket();
  const [presenceMenuOpen, setPresenceMenuOpen] = useState(false);

  const presenceOptions = [
    { id: "online", label: "Online", color: "bg-emerald-500", desc: "Available to chat" },
    { id: "idle", label: "Away / Idle", color: "bg-amber-500", desc: "Stepped away" },
    { id: "dnd", label: "Do Not Disturb", color: "bg-rose-500", desc: "Mute non-urgent alerts" },
    { id: "offline", label: "Invisible", color: "bg-slate-400", desc: "Appear offline" },
  ];

  const handleSetPresence = async (status) => {
    try {
      await updateProfile({ presence: status });
      sendWS({
        type: "set_presence",
        presence: status,
        status_mood: user?.status_mood || ""
      });
    } catch (err) {
      console.error("Failed to update presence:", err);
    } finally {
      setPresenceMenuOpen(false);
    }
  };

  const currentPresence = presenceOptions.find((p) => p.id === user?.presence) || presenceOptions[0];

  return (
    <header className="h-14 border-b border-slate-200 dark:border-navy-800/80 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0 transition-colors">
      <div className="flex items-center space-x-3">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-semibold text-slate-800 dark:text-slate-100 text-base md:text-lg flex items-center space-x-2">
          <span>{currentViewTitle}</span>
        </h1>
      </div>

      {/* Voice Room Status Pill in TopBar if active */}
      {activeVoiceRoom && (
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs md:text-sm animate-pulse">
          <Volume2 className="w-4 h-4" />
          <span className="font-medium hidden sm:inline">{activeVoiceRoom.channelName}</span>
          <button
            onClick={toggleVoiceRoomMic}
            className="p-1 rounded-full hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            title={isVoiceRoomMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isVoiceRoomMuted ? <MicOff className="w-3.5 h-3.5 text-rose-500" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={leaveVoiceRoom}
            className="p-1 rounded-full hover:bg-rose-500/20 text-rose-500"
            title="Disconnect Voice Room"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Global Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-850 hover:bg-slate-200/80 dark:hover:bg-navy-800 border border-slate-200 dark:border-navy-750 text-slate-500 dark:text-slate-400 text-sm transition-all"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] uppercase font-mono bg-white dark:bg-navy-700 rounded border border-slate-200 dark:border-navy-600">
            Ctrl+K
          </kbd>
        </button>

        {/* Presence Selector Menu */}
        <div className="relative">
          <button
            onClick={() => setPresenceMenuOpen(!presenceMenuOpen)}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-navy-750 hover:bg-slate-100 dark:hover:bg-navy-850 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${currentPresence.color}`} />
            <span className="hidden sm:inline">{currentPresence.label}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {presenceMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setPresenceMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-navy-850 border border-slate-200 dark:border-navy-700 shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Set Your Status
                </div>
                {presenceOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSetPresence(opt.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-navy-750 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-slate-400">{opt.desc}</div>
                      </div>
                    </div>
                    {user?.presence === opt.id && (
                      <Check className="w-4 h-4 text-brand-500" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
