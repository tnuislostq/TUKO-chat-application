import React, { useState, useEffect, useRef } from "react";
import { Search, User, Compass, MessageSquare, ArrowRight, Loader2, X } from "lucide-react";
import { api } from "../../services/api";

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectUser,
  onSelectCommunity,
  communities = []
}) {
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setUserResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchUsers(query.trim());
        setUserResults(res.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter communities locally
  const matchingCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.description?.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-navy-950/70 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-750 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
        {/* Search Input Bar */}
        <div className="h-14 border-b border-slate-200 dark:border-navy-800 px-4 flex items-center space-x-3 shrink-0">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, friends, communities..."
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-500" />}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="text-center py-10 text-xs text-slate-400">
              Type anything to discover users or jump to communities.
            </div>
          ) : userResults.length === 0 && matchingCommunities.length === 0 && !loading ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No results found for "{query}".
            </div>
          ) : (
            <>
              {/* Users Section */}
              {userResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Users & Friends
                  </div>
                  <div className="space-y-1">
                    {userResults.map((u) => (
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
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {u.display_name}
                            </div>
                            <div className="text-xs text-brand-500">@{u.username}</div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Communities Section */}
              {matchingCommunities.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Communities
                  </div>
                  <div className="space-y-1">
                    {matchingCommunities.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectCommunity(c);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-navy-850 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{c.icon || "💬"}</span>
                          <div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {c.name}
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-xs">
                              {c.description || "Community"}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
