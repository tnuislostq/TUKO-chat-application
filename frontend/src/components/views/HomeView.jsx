import React from "react";
import {
  Sparkles,
  MessageSquare,
  Users,
  Compass,
  Phone,
  Volume2,
  ArrowRight,
  Plus
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import TukoLogo from "../layout/TukoLogo";

export default function HomeView({
  friends = [],
  communities = [],
  onOpenDMs,
  onOpenFriends,
  onOpenCommunities,
  onSelectCommunity,
  onSelectFriendChat
}) {
  const { user } = useAuth();
  const { startCall, joinVoiceRoom } = useCall();

  const onlineFriends = friends.filter((f) => f.user?.presence === "online");

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-slate-50 dark:bg-navy-950 transition-colors">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-brand-900/90 via-navy-900 to-navy-950 text-white border border-brand-500/30 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="mb-2">
            <TukoLogo className="w-12 h-12" withText={true} textClassName="text-2xl font-black" />
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Welcome back, {user?.display_name}!</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Connect, Chat & Call in Real-Time
          </h2>
          <p className="text-sm text-slate-300">
            Enjoy private WhatsApp-style messaging combined with Discord community channels and crystal-clear WebRTC voice rooms.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onOpenDMs}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-glow transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Direct Messages</span>
            </button>
            <button
              onClick={onOpenCommunities}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-all active:scale-95"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Communities</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Online Friends & Communities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active / Online Friends */}
        <div className="p-6 rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-brand-500" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Online Friends ({onlineFriends.length})
              </h3>
            </div>
            <button
              onClick={onOpenFriends}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              View All
            </button>
          </div>

          {onlineFriends.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 space-y-2">
              <p>No friends are currently online.</p>
              <button
                onClick={onOpenFriends}
                className="text-brand-500 font-semibold hover:underline"
              >
                Add new friends
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {onlineFriends.map((f) => (
                <div
                  key={f.user.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-navy-850 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={f.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.user.username}`}
                        alt={f.user.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-navy-850" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {f.user.display_name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {f.user.status_mood || `@${f.user.username}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => onSelectFriendChat(f.user)}
                      className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:bg-white dark:hover:bg-navy-750 transition-colors"
                      title="Send Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startCall(f.user, "voice")}
                      className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:bg-white dark:hover:bg-navy-750 transition-colors"
                      title="Voice Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Joined Communities */}
        <div className="p-6 rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-brand-500" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Your Communities ({communities.length})
              </h3>
            </div>
            <button
              onClick={onOpenCommunities}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Browse All
            </button>
          </div>

          <div className="space-y-2">
            {communities.slice(0, 4).map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCommunity(c)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-navy-850 hover:bg-slate-100 dark:hover:bg-navy-800 cursor-pointer transition-colors group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="text-2xl shrink-0">{c.icon || "💬"}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {c.channels?.length || 0} channels • {c.members?.length || 1} members
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
