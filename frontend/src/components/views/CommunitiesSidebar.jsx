import React, { useState } from "react";
import {
  Hash,
  Volume2,
  Plus,
  ChevronDown,
  Copy,
  Check,
  Compass,
  Users,
  Radio,
  PhoneOff
} from "lucide-react";
import { useCall } from "../../context/CallContext";
import { api } from "../../services/api";

export default function CommunitiesSidebar({
  communities = [],
  activeCommunity = null,
  activeChannel = null,
  onSelectCommunity,
  onSelectChannel,
  onOpenCreateCommunity,
  onChannelCreated
}) {
  const { activeVoiceRoom, joinVoiceRoom, leaveVoiceRoom } = useCall();
  const [showCommunitySelector, setShowCommunitySelector] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("text");
  const [newChannelTopic, setNewChannelTopic] = useState("");

  const copyInvite = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeCommunity) return;
    try {
      const chan = await api.createChannel(activeCommunity.id, {
        name: newChannelName.trim(),
        type: newChannelType,
        topic: newChannelTopic.trim()
      });
      if (onChannelCreated) onChannelCreated(chan);
      setShowAddChannelModal(false);
      setNewChannelName("");
      setNewChannelTopic("");
    } catch (err) {
      alert("Failed to create channel: " + err.message);
    }
  };

  const textChannels = activeCommunity?.channels?.filter((c) => c.type === "text") || [];
  const voiceChannels = activeCommunity?.channels?.filter((c) => c.type === "voice") || [];

  return (
    <aside className="w-80 h-full bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-800/80 flex flex-col shrink-0 transition-colors select-none">
      {/* Community Selector Header */}
      <div className="relative h-14 border-b border-slate-200 dark:border-navy-800/80 px-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => setShowCommunitySelector(!showCommunitySelector)}
          className="flex items-center space-x-2.5 text-left truncate flex-1 hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl shrink-0">{activeCommunity?.icon || "💬"}</span>
          <div className="truncate">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
              {activeCommunity?.name || "Select Community"}
            </h3>
            <span className="text-[10px] text-slate-400">
              {activeCommunity?.members?.length || 1} members
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        </button>

        <button
          onClick={onOpenCreateCommunity}
          className="p-1.5 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white transition-colors"
          title="Create or Join Community"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Dropdown community switcher */}
        {showCommunitySelector && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowCommunitySelector(false)} />
            <div className="absolute top-14 left-2 right-2 p-2 bg-white dark:bg-navy-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-700 z-40 space-y-1 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                Your Communities
              </div>
              {communities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectCommunity(c);
                    setShowCommunitySelector(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-2 rounded-xl text-left transition-colors ${
                    c.id === activeCommunity?.id
                      ? "bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-navy-750 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xl">{c.icon || "💬"}</span>
                  <span className="text-xs truncate">{c.name}</span>
                </button>
              ))}
              <div className="pt-2 border-t border-slate-100 dark:border-navy-750">
                <button
                  onClick={() => {
                    onOpenCreateCommunity();
                    setShowCommunitySelector(false);
                  }}
                  className="w-full flex items-center space-x-2 p-2 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create / Join Community</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invite Code Quick Banner */}
      {activeCommunity && (
        <div className="px-4 py-2 border-b border-slate-100 dark:border-navy-850 flex items-center justify-between bg-slate-50/50 dark:bg-navy-950/50 text-[11px]">
          <span className="text-slate-400">Invite Code:</span>
          <button
            onClick={() => copyInvite(activeCommunity.invite_code)}
            className="flex items-center space-x-1 font-mono font-bold text-brand-600 dark:text-brand-400 hover:underline"
            title="Click to copy invite code"
          >
            <span>{activeCommunity.invite_code}</span>
            {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TEXT CHANNELS */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Text Channels</span>
            <button
              onClick={() => {
                setNewChannelType("text");
                setShowAddChannelModal(true);
              }}
              className="hover:text-slate-700 dark:hover:text-slate-200"
              title="Add Text Channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {textChannels.map((chan) => {
            const isSelected = chan.id === activeChannel?.id;
            return (
              <button
                key={chan.id}
                onClick={() => onSelectChannel(chan)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left ${
                  isSelected
                    ? "bg-brand-600 text-white font-semibold shadow-glow"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-850"
                }`}
              >
                <Hash className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                <span className="truncate">{chan.name}</span>
              </button>
            );
          })}
        </div>

        {/* VOICE CHANNELS */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Voice Channels</span>
            <button
              onClick={() => {
                setNewChannelType("voice");
                setShowAddChannelModal(true);
              }}
              className="hover:text-slate-700 dark:hover:text-slate-200"
              title="Add Voice Channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {voiceChannels.map((chan) => {
            const isConnected = activeVoiceRoom?.channelId === chan.id;
            return (
              <div
                key={chan.id}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                  isConnected
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-850"
                }`}
              >
                <div
                  onClick={() => joinVoiceRoom(activeCommunity.id, chan.id, chan.name)}
                  className="flex items-center space-x-2.5 flex-1 cursor-pointer truncate"
                >
                  <Volume2 className={`w-4 h-4 ${isConnected ? "text-emerald-500 animate-pulse" : "text-slate-400"}`} />
                  <span className="truncate">{chan.name}</span>
                </div>

                {isConnected && (
                  <button
                    onClick={leaveVoiceRoom}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Leave Voice Room"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Channel Modal */}
      {showAddChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-750 rounded-3xl shadow-2xl p-6 space-y-4">
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
              Create Channel
            </h4>
            <form onSubmit={handleCreateChannel} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Channel Type</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setNewChannelType("text")}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border ${
                      newChannelType === "text"
                        ? "bg-brand-600 text-white border-brand-600"
                        : "border-slate-200 dark:border-navy-700"
                    }`}
                  >
                    # Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelType("voice")}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border ${
                      newChannelType === "voice"
                        ? "bg-brand-600 text-white border-brand-600"
                        : "border-slate-200 dark:border-navy-700"
                    }`}
                  >
                    🔊 Voice
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Channel Name</label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. random-vibes"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Topic (Optional)</label>
                <input
                  type="text"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  placeholder="Channel description or purpose"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChannelModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-glow"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
