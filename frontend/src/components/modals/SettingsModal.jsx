import React, { useState, useEffect, useRef } from "react";
import {
  X,
  User,
  Palette,
  Mic,
  Video,
  Bell,
  Shield,
  LogOut,
  Save,
  Check,
  Volume2,
  Trash2,
  Sparkles
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { sounds } from "../../services/sounds";
import { api } from "../../services/api";

const AVATAR_SEEDS = [
  "Aria", "Kai", "Sora", "Sam", "Phoenix", "Nova", "Leo", "Maya", "Zane", "Luna"
];

const ACCENT_COLORS = [
  { id: "violet", label: "Violet (Default)", hex: "#7c3aed" },
  { id: "indigo", label: "Indigo Deep", hex: "#4f46e5" },
  { id: "emerald", label: "Emerald Fresh", hex: "#059669" },
  { id: "rose", label: "Rose Punch", hex: "#e11d48" }
];

export default function SettingsModal({ onClose }) {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme, accent, setAccent } = useTheme();

  const [activeTab, setActiveTab] = useState("profile");
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [statusMood, setStatusMood] = useState(user?.status_mood || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);

  // Audio / Video Testing state
  const [micVolume, setMicVolume] = useState(0);
  const [testingMedia, setTestingMedia] = useState(false);
  const testVideoRef = useRef(null);
  const testStreamRef = useRef(null);

  useEffect(() => {
    if (activeTab === "privacy") {
      api.getBlockedUsers().then((res) => {
        setBlockedUsers(res.blocked || []);
      });
    }
  }, [activeTab]);

  // Clean up media test stream when leaving or closing
  useEffect(() => {
    return () => {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        display_name: displayName,
        bio,
        status_mood: statusMood,
        avatar
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save profile: " + err.message);
    }
  };

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) sounds.playTone("send");
  };

  const handleUnblock = async (targetId) => {
    try {
      await api.unblockUser(targetId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetId));
    } catch (err) {
      alert(err.message);
    }
  };

  // Start Mic & Video preview test
  const startDeviceTest = async () => {
    if (testingMedia) {
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach((t) => t.stop());
        testStreamRef.current = null;
      }
      setTestingMedia(false);
      setMicVolume(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      testStreamRef.current = stream;
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
      }
      setTestingMedia(true);

      // Audio volume meter
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const micSource = audioCtx.createMediaStreamSource(stream);
      micSource.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!testStreamRef.current) return;
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const average = sum / buffer.length;
        setMicVolume(Math.min(100, Math.round((average / 128) * 100)));
        requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (err) {
      alert("Unable to access devices for test: " + err.message);
    }
  };

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "devices", label: "Audio & Video", icon: Mic },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy & Blocked", icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-3xl h-[85vh] max-h-[640px] bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-750 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* Left Navigation Sidebar */}
        <div className="w-full md:w-60 bg-slate-50 dark:bg-navy-950 border-b md:border-b-0 md:border-r border-slate-200 dark:border-navy-800/80 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 px-3">
              Settings
            </h3>
            <nav className="space-y-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-brand-600 text-white shadow-glow"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-navy-850"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Logout Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-navy-800">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-navy-900">
          {/* Top Bar with Close Button */}
          <div className="h-14 border-b border-slate-200 dark:border-navy-800 px-6 flex items-center justify-between shrink-0">
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 capitalize">
              {activeTab} Settings
            </h4>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6 max-w-lg">
                {/* Avatar Seed Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Avatar Style
                  </label>
                  <div className="flex items-center space-x-3">
                    <img
                      src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-500 shadow-md bg-slate-200 dark:bg-navy-800"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Pick a preset persona avatar:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {AVATAR_SEEDS.map((seed) => (
                          <button
                            key={seed}
                            type="button"
                            onClick={() =>
                              setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`)
                            }
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-navy-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-navy-700"
                          >
                            {seed}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>

                {/* Status Mood */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Status Mood
                  </label>
                  <input
                    type="text"
                    value={statusMood}
                    onChange={(e) => setStatusMood(e.target.value)}
                    placeholder="e.g. 🚀 Building the future"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    About / Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-glow transition-all active:scale-95"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === "appearance" && (
              <div className="space-y-6 max-w-lg">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Theme Preference
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["dark", "light", "system"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`p-3 rounded-2xl border text-center font-semibold text-xs capitalize transition-all ${
                          theme === t
                            ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 shadow-sm"
                            : "border-slate-200 dark:border-navy-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Accent Color
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ACCENT_COLORS.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => setAccent(col.id)}
                        className={`flex items-center space-x-3 p-3 rounded-2xl border transition-all ${
                          accent === col.id
                            ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 font-semibold"
                            : "border-slate-200 dark:border-navy-750 hover:bg-slate-50 dark:hover:bg-navy-800"
                        }`}
                      >
                        <span
                          style={{ backgroundColor: col.hex }}
                          className="w-4 h-4 rounded-full shadow-sm"
                        />
                        <span className="text-xs text-slate-800 dark:text-slate-200">
                          {col.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AUDIO & VIDEO DEVICES TAB */}
            {activeTab === "devices" && (
              <div className="space-y-6 max-w-lg">
                <div className="space-y-3">
                  <h5 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                    Camera & Microphone Check
                  </h5>
                  <p className="text-xs text-slate-400">
                    Verify that your microphone picks up sound and your camera works smoothly before joining calls.
                  </p>

                  <button
                    onClick={startDeviceTest}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      testingMedia
                        ? "bg-rose-600 hover:bg-rose-500 text-white"
                        : "bg-brand-600 hover:bg-brand-500 text-white shadow-glow"
                    }`}
                  >
                    {testingMedia ? "Stop Testing" : "Start Device Test"}
                  </button>

                  {/* Microphone Level Meter */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span>Mic Input Level</span>
                      <span>{micVolume}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-navy-800 overflow-hidden">
                      <div
                        style={{ width: `${micVolume}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                      />
                    </div>
                  </div>

                  {/* Camera Preview Box */}
                  <div className="pt-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Camera Preview
                    </label>
                    <div className="w-full h-48 rounded-2xl bg-black overflow-hidden relative border border-slate-200 dark:border-navy-750 flex items-center justify-center">
                      <video
                        ref={testVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 ${
                          testingMedia ? "block" : "hidden"
                        }`}
                      />
                      {!testingMedia && (
                        <div className="text-xs text-slate-400 flex flex-col items-center space-y-1">
                          <Video className="w-6 h-6 opacity-40" />
                          <span>Camera is idle</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="space-y-6 max-w-lg">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-navy-750">
                  <div>
                    <h5 className="font-semibold text-xs md:text-sm text-slate-800 dark:text-slate-100">
                      Audio Effects & Tones
                    </h5>
                    <p className="text-xs text-slate-400">
                      Play pleasant tones for incoming messages, sends, and call rings.
                    </p>
                  </div>
                  <button
                    onClick={toggleSound}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      soundEnabled ? "bg-brand-600" : "bg-slate-300 dark:bg-navy-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        soundEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 space-y-2">
                  <h5 className="font-semibold text-xs md:text-sm text-slate-800 dark:text-slate-100">
                    Desktop Notification Permission
                  </h5>
                  <p className="text-xs text-slate-400">
                    Get alerted when you receive new direct messages or calls while working in other tabs.
                  </p>
                  <button
                    onClick={() => {
                      if ("Notification" in window) {
                        Notification.requestPermission().then((perm) => {
                          alert(`Notification status: ${perm}`);
                        });
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-navy-750 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-brand-600 hover:text-white transition-colors"
                  >
                    Request Permission
                  </button>
                </div>
              </div>
            )}

            {/* PRIVACY & BLOCKED TAB */}
            {activeTab === "privacy" && (
              <div className="space-y-4 max-w-lg">
                <h5 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  Blocked Users ({blockedUsers.length})
                </h5>
                <p className="text-xs text-slate-400">
                  Users you have blocked cannot send you direct messages or initiate calls.
                </p>

                {blockedUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-navy-850 rounded-2xl border border-slate-200 dark:border-navy-750">
                    No blocked users.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-navy-750"
                      >
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={b.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.username}`}
                            alt={b.display_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {b.display_name}
                            </div>
                            <div className="text-[10px] text-slate-400">@{b.username}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblock(b.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
