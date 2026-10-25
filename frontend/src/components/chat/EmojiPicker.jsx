import React from "react";

const EMOJI_CATEGORIES = [
  {
    name: "Popular",
    emojis: ["❤️", "🔥", "👍", "😂", "🚀", "🎉", "✨", "👏", "🙌", "💯", "😍", "🥳"]
  },
  {
    name: "Faces",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😎", "🤩", "🥳", "😏", "🧐", "🤔"]
  },
  {
    name: "Reactions & Hands",
    emojis: ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "✋", "🤚", "👋"]
  },
  {
    name: "Vibes & Tech",
    emojis: ["🔥", "✨", "⚡", "💥", "🚀", "💻", "📱", "🎮", "🎧", "☕", "🍕", "🍔", "🏆", "🎯", "💡", "🔮", "💎", "⭐", "🌟", "🎉"]
  }
];

export default function EmojiPicker({ onSelect, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-14 right-2 sm:right-6 w-72 sm:w-80 p-3 bg-white dark:bg-navy-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-700 z-50 animate-in fade-in zoom-in-95">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                {cat.name}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSelect(emoji);
                      onClose();
                    }}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-navy-750 rounded-lg transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
