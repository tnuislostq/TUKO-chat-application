import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  MessageSquare,
  Phone,
  Video,
  Check,
  X,
  Search,
  Loader2,
  UserCheck
} from "lucide-react";
import { api } from "../../services/api";
import { useCall } from "../../context/CallContext";

export default function FriendsView({ onSelectFriendChat }) {
  const { startCall } = useCall();
  const [tab, setTab] = useState("online"); // 'online', 'all', 'pending', 'add'
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);

  // Add friend field
  const [addUsername, setAddUsername] = useState("");
  const [addStatus, setAddStatus] = useState(null);
  const [addLoading, setAddLoading] = useState(false);

  const fetchFriendsData = async () => {
    try {
      const [fRes, pRes] = await Promise.all([
        api.getFriends(),
        api.getPendingFriends()
      ]);
      setFriends(fRes.friends || []);
      setPending(pRes || { incoming: [], outgoing: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsData();
  }, []);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!addUsername.trim()) return;
    setAddLoading(true);
    setAddStatus(null);
    try {
      await api.sendFriendRequest(addUsername.trim());
      setAddStatus({ success: true, message: `Friend request sent to @${addUsername}!` });
      setAddUsername("");
      fetchFriendsData();
    } catch (err) {
      setAddStatus({ success: false, message: err.message });
    } finally {
      setAddLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await api.acceptFriendRequest(requestId);
      fetchFriendsData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDecline = async (requestId) => {
    try {
      await api.declineFriendRequest(requestId);
      fetchFriendsData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (confirm("Remove friend?")) {
      try {
        await api.removeFriend(friendId);
        fetchFriendsData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const onlineFriends = friends.filter((f) => f.user?.presence === "online");

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-navy-950 transition-colors overflow-hidden select-none">
      {/* Top Bar with Navigation Tabs */}
      <div className="h-14 border-b border-slate-200 dark:border-navy-800/80 px-6 flex items-center justify-between bg-white dark:bg-navy-900 shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-bold text-sm pr-4 border-r border-slate-200 dark:border-navy-800 shrink-0">
            <Users className="w-5 h-5 text-brand-500" />
            <span>Friends</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setTab("online")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tab === "online"
                  ? "bg-slate-200/80 dark:bg-navy-800 text-brand-600 dark:text-brand-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              Online ({onlineFriends.length})
            </button>
            <button
              onClick={() => setTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tab === "all"
                  ? "bg-slate-200/80 dark:bg-navy-800 text-brand-600 dark:text-brand-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              All ({friends.length})
            </button>
            <button
              onClick={() => setTab("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tab === "pending"
                  ? "bg-slate-200/80 dark:bg-navy-800 text-brand-600 dark:text-brand-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              Pending ({pending.incoming.length})
            </button>
            <button
              onClick={() => setTab("add")}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tab === "add"
                  ? "bg-brand-600 text-white shadow-glow"
                  : "bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Friend</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {/* ADD FRIEND TAB */}
        {tab === "add" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Add Friend on Tuko
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can add friends with their unique Tuko username or user ID.
              </p>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  required
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="Enter a username (e.g. alex_dev)"
                  className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                />
              </div>

              {addStatus && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold text-center ${
                    addStatus.success
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {addStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={addLoading}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-glow transition-all active:scale-95 disabled:opacity-50"
              >
                {addLoading ? "Sending Request..." : "Send Friend Request"}
              </button>
            </form>
          </div>
        )}

        {/* PENDING TAB */}
        {tab === "pending" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Incoming Requests ({pending.incoming.length})
            </h4>

            {pending.incoming.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-white dark:bg-navy-900 rounded-3xl border border-slate-200 dark:border-navy-800">
                No incoming friend requests.
              </div>
            ) : (
              <div className="space-y-2">
                {pending.incoming.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={req.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user.username}`}
                        alt={req.user.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {req.user.display_name}
                        </div>
                        <div className="text-[11px] text-slate-400">@{req.user.username}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                        title="Accept Request"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDecline(req.id)}
                        className="p-2 rounded-xl bg-slate-200 dark:bg-navy-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-400"
                        title="Decline Request"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONLINE & ALL FRIENDS TABS */}
        {(tab === "online" || tab === "all") && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs text-slate-400">
              {tab === "online" ? `Online — ${onlineFriends.length}` : `All Friends — ${friends.length}`}
            </h4>

            {(tab === "online" ? onlineFriends : friends).length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 bg-white dark:bg-navy-900 rounded-3xl border border-slate-200 dark:border-navy-800">
                {tab === "online" ? "None of your friends are currently online." : "No friends added yet."}
              </div>
            ) : (
              <div className="space-y-2">
                {(tab === "online" ? onlineFriends : friends).map((f) => (
                  <div
                    key={f.user.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={f.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.user.username}`}
                          alt={f.user.display_name}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white dark:ring-navy-900 ${
                            f.user.presence === "online" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {f.user.display_name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {f.user.status_mood || `@${f.user.username}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => onSelectFriendChat(f.user)}
                        className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                        title="Start Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startCall(f.user, "voice")}
                        className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startCall(f.user, "video")}
                        className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(f.user.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove Friend"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
