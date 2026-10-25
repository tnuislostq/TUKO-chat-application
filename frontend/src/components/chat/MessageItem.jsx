import React, { useState } from "react";
import {
  Reply,
  Smile,
  Pin,
  Copy,
  Edit2,
  Trash2,
  Check,
  FileText,
  Download,
  ExternalLink
} from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import EmojiPicker from "./EmojiPicker";
import { BACKEND_URL } from "../../services/api";

export default function MessageItem({
  message,
  currentUserId,
  onReply,
  onReact,
  onPin,
  onEdit,
  onDelete
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const isSelf = message.sender_id === currentUserId;
  const isDeleted = message.is_deleted;

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEdit(message.id, editText.trim());
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      className={`group relative flex space-x-3 px-4 py-2 hover:bg-slate-100/70 dark:hover:bg-navy-850/50 transition-colors ${
        message.pinned ? "bg-amber-500/5 border-l-2 border-amber-500" : ""
      }`}
    >
      {/* Sender Avatar */}
      <div className="shrink-0 pt-0.5">
        <img
          src={message.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender_name}`}
          alt={message.sender_name}
          className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-navy-800"
        />
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header */}
        <div className="flex items-baseline space-x-2">
          <span className="font-semibold text-xs md:text-sm text-slate-800 dark:text-slate-100">
            {message.sender_name}
          </span>
          <span className="text-[10px] text-slate-400">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.pinned && (
            <span className="text-[10px] text-amber-500 font-medium flex items-center space-x-0.5">
              <Pin className="w-2.5 h-2.5" />
              <span>Pinned</span>
            </span>
          )}
          {message.is_edited && !isDeleted && (
            <span className="text-[10px] text-slate-400 italic">(edited)</span>
          )}
        </div>

        {/* Reply Quote Banner */}
        {message.reply_to && (
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-navy-800 text-xs text-slate-600 dark:text-slate-300 border-l-2 border-brand-500 max-w-lg">
            <Reply className="w-3 h-3 text-brand-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
              {message.reply_to.sender_name}:
            </span>
            <span className="truncate">{message.reply_to.text}</span>
          </div>
        )}

        {/* Message Content */}
        {isEditing ? (
          <div className="mt-1 space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 text-sm rounded-xl border border-brand-500 dark:bg-navy-800 text-slate-800 dark:text-slate-100 focus:outline-none resize-none"
              rows={2}
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveEdit}
                className="px-2.5 py-1 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={`text-sm leading-relaxed ${isDeleted ? "text-slate-400 italic" : "text-slate-800 dark:text-slate-200"}`}>
            {message.text}
          </div>
        )}

        {/* Voice Note Player */}
        {message.voice_note && !isDeleted && (
          <div className="mt-2">
            <AudioPlayer src={message.voice_note.url} duration={message.voice_note.duration} />
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && !isDeleted && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att, idx) => {
              const fullUrl = att.url.startsWith("http") ? att.url : `${BACKEND_URL}${att.url}`;
              const isImage = att.content_type?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(att.name);

              if (isImage) {
                return (
                  <div key={idx} className="relative group/att rounded-xl overflow-hidden max-w-xs border border-slate-200 dark:border-navy-700 shadow-sm">
                    <img
                      src={fullUrl}
                      alt={att.name}
                      onClick={() => setPreviewImage(fullUrl)}
                      className="max-h-48 rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    />
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/att:opacity-100 transition-opacity"
                      title="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 max-w-sm"
                >
                  <FileText className="w-6 h-6 text-brand-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {att.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatFileSize(att.size)}
                    </div>
                  </div>
                  <a
                    href={fullUrl}
                    download={att.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-200 dark:hover:bg-navy-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Reaction Badges */}
        {message.reactions && Object.keys(message.reactions).length > 0 && !isDeleted && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              if (!userIds || userIds.length === 0) return null;
              const hasReacted = userIds.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                    hasReacted
                      ? "bg-brand-500/15 border border-brand-500/40 text-brand-600 dark:text-brand-400 font-semibold"
                      : "bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px]">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Menu on Hover */}
      {!isDeleted && (
        <div className="absolute right-4 -top-3 hidden group-hover:flex items-center space-x-0.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl shadow-md p-1 z-10 animate-in fade-in">
          {/* Quick Reacts */}
          <button
            onClick={() => onReact(message.id, "❤️")}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 text-xs transition-transform hover:scale-125"
            title="Love"
          >
            ❤️
          </button>
          <button
            onClick={() => onReact(message.id, "🔥")}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 text-xs transition-transform hover:scale-125"
            title="Fire"
          >
            🔥
          </button>
          <button
            onClick={() => onReact(message.id, "👍")}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 text-xs transition-transform hover:scale-125"
            title="Thumbs Up"
          >
            👍
          </button>

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
            title="Add Reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onReply(message)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onPin(message.id)}
            className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors ${
              message.pinned ? "text-amber-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
            title={message.pinned ? "Unpin Message" : "Pin Message"}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
            title="Copy Text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {isSelf && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors"
                title="Edit Message"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete Message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {showEmojiPicker && (
            <EmojiPicker
              onSelect={(emoji) => onReact(message.id, emoji)}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
      )}

      {/* Image Modal Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
