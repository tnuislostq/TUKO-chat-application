import React, { useState, useRef } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  X,
  Reply,
  FileText,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import VoiceRecorder from "./VoiceRecorder";
import { api } from "../../services/api";

export default function ChatInput({
  onSendMessage,
  onTyping,
  replyingTo,
  onCancelReply,
  placeholder = "Message..."
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);

    // Emit typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;

    onSendMessage({
      text: text.trim(),
      attachments,
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            sender_name: replyingTo.sender_name,
            text: replyingTo.text
          }
        : null
    });

    setText("");
    setAttachments([]);
    if (onCancelReply) onCancelReply();
    if (onTyping) onTyping(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await api.uploadFile(file);
      setAttachments((prev) => [...prev, res]);
    } catch (err) {
      console.error("File upload failed:", err);
      alert(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecordComplete = (voiceData) => {
    onSendMessage({
      text: "",
      attachments: [],
      voice_note: voiceData,
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            sender_name: replyingTo.sender_name,
            text: replyingTo.text
          }
        : null
    });
    setIsRecordingVoice(false);
    if (onCancelReply) onCancelReply();
  };

  return (
    <div className="p-3 md:p-4 bg-white dark:bg-navy-900 border-t border-slate-200 dark:border-navy-800/80 transition-colors">
      {/* Reply Quote Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-slate-100 dark:bg-navy-800 border-l-4 border-brand-500 text-xs">
          <div className="flex items-center space-x-2 truncate">
            <Reply className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Replying to {replyingTo.sender_name}:
            </span>
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {replyingTo.text}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachments Preview Badges */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-brand-500" />
              <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-xs">
                {att.name}
              </span>
              <button
                onClick={() => removeAttachment(idx)}
                className="text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Recorder View or Normal Input View */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onRecordComplete={handleVoiceRecordComplete}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <div className="relative flex items-center space-y-0 space-x-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors disabled:opacity-50"
            title="Attach File or Image"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full py-2.5 pl-3 pr-10 rounded-2xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none transition-all"
            />
            {/* Emoji Trigger inside textarea right */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Voice Note Button or Send Button */}
          {text.trim() || attachments.length > 0 ? (
            <button
              onClick={handleSend}
              className="p-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white shadow-glow transition-all active:scale-95"
              title="Send Message"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setIsRecordingVoice(true)}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-navy-850 hover:bg-brand-600 hover:text-white text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-navy-750 transition-all active:scale-95"
              title="Record Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          {/* Emoji Popover */}
          {showEmojiPicker && (
            <EmojiPicker
              onSelect={(emoji) => setText((prev) => prev + emoji)}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
