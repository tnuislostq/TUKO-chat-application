import React, { useState } from "react";
import {
  X,
  Phone,
  Video,
  Pin,
  FileText,
  ShieldAlert,
  Copy,
  Check,
  Crown,
  Shield,
  Circle,
  Hash,
  Volume2
} from "lucide-react";
import { useCall } from "../../context/CallContext";
import { api } from "../../services/api";

export default function ContextPanel({
  mode = "dm", // 'dm' or 'community'
  partner = null,
  community = null,
  pinnedMessages = [],
  onClose,
  onStartCall,
  onUnpinMessage
}) {
  const { startCall } = useCall();
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // 'info', 'pinned', 'members'

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleBlock = async () => {
    if (!partner) return;
    if (confirm(`Are you sure you want to block @${partner.username}?`)) {
      try {
        await api.blockUser(partner.id);
        alert(`Blocked @${partner.username}`);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <aside className="w-80 h-full bg-white dark:bg-navy-900 border-l border-slate-200 dark:border-navy-800/80 flex flex-col z-20 shrink-0 transition-colors">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-navy-800/80 px-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
          {mode === "dm" ? "Contact Details" : "Community Info"}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-navy-800 text-xs font-medium px-4">
        <button
          onClick={() => setActiveTab("info")}
          className={`py-2.5 px-3 border-b-2 transition-all ${
            activeTab === "info"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          Overview
        </button>
        {mode === "community" && (
          <button
            onClick={() => setActiveTab("members")}
            className={`py-2.5 px-3 border-b-2 transition-all ${
              activeTab === "members"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            Members ({community?.members?.length || 0})
          </button>
        )}
        <button
          onClick={() => setActiveTab("pinned")}
          className={`py-2.5 px-3 border-b-2 transition-all ${
            activeTab === "pinned"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          Pinned ({pinnedMessages.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {mode === "dm" && partner && activeTab === "info" && (
          <div className="space-y-5">
            {/* User Profile Card */}
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-navy-750">
              <div className="relative mb-3">
                <img
                  src={partner.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.username}`}
                  alt={partner.display_name}
                  className="w-20 h-20 rounded-full object-cover shadow-sm bg-slate-200 dark:bg-navy-750"
                />
                <span
                  className={`absolute bottom-0 right-1 w-4 h-4 rounded-full ring-2 ring-white dark:ring-navy-850 ${
                    partner.presence === "online"
                      ? "bg-emerald-500"
                      : partner.presence === "idle"
                      ? "bg-amber-500"
                      : partner.presence === "dnd"
                      ? "bg-rose-500"
                      : "bg-slate-400"
                  }`}
                />
              </div>

              <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                {partner.display_name}
              </h4>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                @{partner.username}
              </p>

              {partner.status_mood && (
                <div className="mt-2 text-xs px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  {partner.status_mood}
                </div>
              )}

              {/* Call Buttons */}
              <div className="flex items-center space-x-3 mt-4">
                <button
                  onClick={() => startCall(partner, "voice")}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-navy-750 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Voice</span>
                </button>
                <button
                  onClick={() => startCall(partner, "video")}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-glow transition-all"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>
              </div>
            </div>

            {/* Bio Section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                About
              </label>
              <div className="text-sm text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-navy-750">
                {partner.bio || "No bio yet."}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-200 dark:border-navy-800 space-y-2">
              <button
                onClick={handleBlock}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Block User</span>
              </button>
            </div>
          </div>
        )}

        {mode === "community" && community && activeTab === "info" && (
          <div className="space-y-5">
            {/* Community Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{community.icon || "💬"}</span>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                    {community.name}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {community.members?.length || 1} members
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {community.description || "Welcome to our community!"}
              </p>
            </div>

            {/* Invite Code Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Invite Code
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700">
                <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                  {community.invite_code}
                </span>
                <button
                  onClick={() => copyInviteCode(community.invite_code)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white dark:bg-navy-700 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Channels List Overview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Channels ({community.channels?.length || 0})
              </label>
              <div className="space-y-1">
                {community.channels?.map((chan) => (
                  <div
                    key={chan.id}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-navy-850/50"
                  >
                    {chan.type === "voice" ? (
                      <Volume2 className="w-3.5 h-3.5 text-brand-500" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="font-medium">{chan.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Community Members Tab */}
        {mode === "community" && community && activeTab === "members" && (
          <div className="space-y-3">
            {community.members?.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-navy-850 transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="relative">
                    <img
                      src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.username}`}
                      alt={m.display_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-navy-900 ${
                        m.presence === "online" ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {m.display_name}
                    </div>
                    <div className="text-[10px] text-slate-400">@{m.username}</div>
                  </div>
                </div>

                {m.role === "owner" ? (
                  <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Crown className="w-3 h-3" />
                    <span>Owner</span>
                  </span>
                ) : m.role === "admin" ? (
                  <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                    <Shield className="w-3 h-3" />
                    <span>Admin</span>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* Pinned Messages Tab */}
        {activeTab === "pinned" && (
          <div className="space-y-3">
            {pinnedMessages.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <Pin className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No pinned messages yet
              </div>
            ) : (
              pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {msg.sender_name}
                    </span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-3">
                    {msg.text}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
