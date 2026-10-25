import React, { useState } from "react";
import { Search, Plus, MessageSquare, Circle } from "lucide-react";

export default function DirectMessagesSidebar({
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onOpenNewChat
}) {
  const [filter, setFilter] = useState("");

  const filtered = conversations.filter((c) => {
    const name = c.other_user?.display_name || "";
    const username = c.other_user?.username || "";
    const q = filter.toLowerCase();
    return name.toLowerCase().includes(q) || username.toLowerCase().includes(q);
  });

  return (
    <aside className="w-80 h-full bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-800/80 flex flex-col shrink-0 transition-colors select-none">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-navy-800/80 px-4 flex items-center justify-between shrink-0">
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <span>Direct Messages</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-navy-800 text-slate-500 font-semibold">
            {conversations.length}
          </span>
        </h3>
        <button
          onClick={onOpenNewChat}
          className="p-2 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white transition-all shadow-sm"
          title="Start New Direct Message"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Filter Input */}
      <div className="p-3 border-b border-slate-100 dark:border-navy-850">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 text-xs text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
            <p>No conversations found</p>
            <button
              onClick={onOpenNewChat}
              className="text-brand-500 font-semibold hover:underline"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filtered.map((c) => {
            const isSelected = c.id === activeConversationId;
            const ou = c.other_user || {};
            const lastMsg = c.last_message;

            return (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c)}
                className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-brand-500/15 border border-brand-500/30 text-brand-900 dark:text-brand-100"
                    : "hover:bg-slate-100 dark:hover:bg-navy-850 text-slate-700 dark:text-slate-300"
                }`}
              >
                {/* Avatar with Presence status */}
                <div className="relative shrink-0">
                  <img
                    src={ou.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ou.username}`}
                    alt={ou.display_name}
                    className="w-11 h-11 rounded-full object-cover bg-slate-200 dark:bg-navy-800"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-navy-900 ${
                      ou.presence === "online"
                        ? "bg-emerald-500"
                        : ou.presence === "idle"
                        ? "bg-amber-500"
                        : ou.presence === "dnd"
                        ? "bg-rose-500"
                        : "bg-slate-400"
                    }`}
                  />
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-xs md:text-sm text-slate-800 dark:text-slate-100 truncate">
                      {ou.display_name}
                    </span>
                    {lastMsg && (
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                        {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {lastMsg ? lastMsg.text : "No messages yet"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
