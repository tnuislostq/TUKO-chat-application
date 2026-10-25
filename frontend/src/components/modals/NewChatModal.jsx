import React, { useState, useEffect } from "react";
import { X, Search, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { api } from "../../services/api";

export default function NewChatModal({ isOpen, onClose, onSelectUser, friends = [] }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchUsers(query.trim());
        setSearchResults(res.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-750 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-navy-800 px-5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-brand-500" />
            <span>New Direct Message</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-3 border-b border-slate-100 dark:border-navy-800">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {query.trim() ? (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Search Results
              </div>
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-500" />
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No users found for "{query}".
                </div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-navy-850 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                        alt={u.display_name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {u.display_name}
                        </div>
                        <div className="text-[11px] text-brand-500">@{u.username}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Your Friends
              </div>
              {friends.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No friends yet. Search above to find users.
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.user.id}
                    onClick={() => {
                      onSelectUser(f.user);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-navy-850 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={f.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.user.username}`}
                        alt={f.user.display_name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {f.user.display_name}
                        </div>
                        <div className="text-[11px] text-slate-400">@{f.user.username}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
