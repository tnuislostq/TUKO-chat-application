import React, { useRef, useEffect } from "react";
import {
  Phone,
  Video,
  Sidebar,
  Search,
  Hash,
  Volume2,
  Sparkles,
  MessageSquare
} from "lucide-react";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";
import { useCall } from "../../context/CallContext";

export default function ChatArea({
  mode = "dm", // 'dm' or 'channel'
  title = "Chat",
  subtitle = "",
  avatar = "",
  presence = "offline",
  statusMood = "",
  partner = null,
  channel = null,
  community = null,
  messages = [],
  currentUserId,
  typingText = "",
  replyingTo,
  onReply,
  onCancelReply,
  onSendMessage,
  onReact,
  onPin,
  onEdit,
  onDelete,
  onTyping,
  isContextPanelOpen,
  onToggleContextPanel
}) {
  const { startCall } = useCall();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, typingText]);

  // Group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach((msg) => {
      const dateStr = new Date(msg.created_at).toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-navy-950 min-w-0 transition-colors overflow-hidden">
      {/* Chat Header */}
      <header className="h-14 border-b border-slate-200 dark:border-navy-800/80 px-4 flex items-center justify-between bg-white/70 dark:bg-navy-900/70 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          {mode === "dm" && (
            <div className="relative shrink-0">
              <img
                src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${title}`}
                alt={title}
                className="w-9 h-9 rounded-full object-cover bg-slate-200 dark:bg-navy-800"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-navy-900 ${
                  presence === "online"
                    ? "bg-emerald-500"
                    : presence === "idle"
                    ? "bg-amber-500"
                    : presence === "dnd"
                    ? "bg-rose-500"
                    : "bg-slate-400"
                }`}
              />
            </div>
          )}

          {mode === "channel" && (
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              {channel?.type === "voice" ? <Volume2 className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100 truncate flex items-center space-x-2">
              <span>{title}</span>
              {statusMood && (
                <span className="hidden sm:inline-block text-[11px] font-normal text-slate-400 truncate">
                  • {statusMood}
                </span>
              )}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {mode === "dm" && partner && (
            <>
              <button
                onClick={() => startCall(partner, "voice")}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => startCall(partner, "video")}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={onToggleContextPanel}
            className={`p-2 rounded-xl transition-colors ${
              isContextPanelOpen
                ? "bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800"
            }`}
            title="Toggle Details Panel"
          >
            <Sidebar className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 select-none">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-500 flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-slate-700 dark:text-slate-200 mb-1">
              Start of {title}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Send a message, audio voice note, or drop attachments to begin chatting.
            </p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([dateLabel, groupMsgs]) => (
            <div key={dateLabel} className="space-y-1">
              {/* Date Separator Pill */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-navy-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-navy-700">
                  {dateLabel}
                </span>
              </div>

              {groupMsgs.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onReact={onReact}
                  onPin={onPin}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingText && (
          <div className="px-4 py-1 text-xs text-brand-500 italic flex items-center space-x-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            <span>{typingText}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSendMessage={onSendMessage}
        onTyping={onTyping}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        placeholder={`Message ${title}...`}
      />
    </div>
  );
}
