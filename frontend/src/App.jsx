import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Send, MessageSquare, Users, Hash, ShieldCheck, Menu, X,
  Smile, LogOut, Wifi, WifiOff, Volume2, VolumeX, Sparkles,
  Search, Plus, Flame, Heart, ThumbsUp, Laugh, Rocket, Clapperboard,
  Gamepad2, Code, Music, Bell, RefreshCw, CheckCircle2, ChevronRight
} from "lucide-react";

// Synthesize pleasant sound effects via Web Audio API (Zero external mp3 files needed)
const playAudioTone = (type = "send") => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "send") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "receive") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "react") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1050, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (err) {
    // Ignore audio autoplay policy restrictions
  }
};

const AVATAR_SEEDS = [
  "Tanu", "Aria", "Kai", "Sora", "CyberSam", "NeonCat", "Phoenix", "Nova"
];

const MOOD_TAGS = [
  "🚀 In the Zone",
  "💻 Coding Full-Stack",
  "🎮 Ready to Game",
  "🎧 Lo-Fi Vibes",
  "☕ Chilling",
  "✨ Lurking"
];

const DEFAULT_ROOMS = [
  { id: "general", name: "General Hub", desc: "Main public discussions", icon: "MessageSquare" },
  { id: "tech", name: "Dev & Code", desc: "React, Python, APIs & algorithms", icon: "Code" },
  { id: "gaming", name: "Gaming Lounge", desc: "Valorant, MLBB & game chat", icon: "Gamepad2" },
  { id: "music", name: "Music & Beats", desc: "Playlists & recommendations", icon: "Music" },
  { id: "announcements", name: "Announcements", desc: "Updates from server admin", icon: "Bell" }
];

const EMOJI_REACTIONS = ["❤️", "🔥", "😂", "🚀", "👍", "👏"];

export default function App() {
  // Authentication & Persona States
  const [username, setUsername] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("Tanu");
  const [statusMood, setStatusMood] = useState("🚀 In the Zone");
  const [isJoined, setIsJoined] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Chat & Navigation States
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [currentRoom, setCurrentRoom] = useState("general");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState({});

  // UI Drawers & Modals
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [onlineDrawerOpen, setOnlineDrawerOpen] = useState(false);
  const [newRoomModalOpen, setNewRoomModalOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ id: "", name: "", desc: "" });

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Dynamic backend host configuration
  const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  const wsProtocol = backendBaseUrl.startsWith("https") ? "wss://" : "ws://";
  const backendHost = backendBaseUrl.replace(/^https?:\/\//, "");

  // Load saved persona
  useEffect(() => {
    const savedUser = localStorage.getItem("tuko_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUsername(parsed.username || "");
        setAvatarSeed(parsed.avatarSeed || "Tanu");
        setStatusMood(parsed.statusMood || "🚀 In the Zone");
        setIsJoined(true);
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  // Fetch Rooms & Messages on mount / change
  useEffect(() => {
    fetch(`${backendBaseUrl}/api/rooms`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRooms(data);
        }
      })
      .catch(() => {});
  }, [backendBaseUrl]);

  useEffect(() => {
    if (!isJoined) return;
    fetch(`${backendBaseUrl}/api/messages?room=${currentRoom}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(() => {});
  }, [currentRoom, isJoined, backendBaseUrl]);

  // WebSocket lifecycle
  useEffect(() => {
    if (!isJoined || !username) return;

    const userAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`;
    const wsUrl = `${wsProtocol}${backendHost}/ws/${currentRoom}/${encodeURIComponent(username)}?avatar=${encodeURIComponent(userAvatarUrl)}&status_mood=${encodeURIComponent(statusMood)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "new_message") {
          setMessages((prev) => [...prev, data.message]);
          if (soundEnabled && data.message.sender !== username) {
            playAudioTone("receive");
          }
        } else if (data.type === "user_joined") {
          if (Array.isArray(data.online_users)) {
            setOnlineUsers(data.online_users);
          }
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}-${Math.random()}`,
              system: true,
              text: `👋 ${data.username} joined #${currentRoom}`,
              timestamp: data.timestamp
            }
          ]);
        } else if (data.type === "user_left") {
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}-${Math.random()}`,
              system: true,
              text: `🚶 ${data.username} left #${currentRoom}`,
              timestamp: data.timestamp
            }
          ]);
        } else if (data.type === "typing") {
          if (data.username !== username) {
            setTypingUsers((prev) => ({
              ...prev,
              [data.username]: data.is_typing
            }));
          }
        } else if (data.type === "reaction_updated") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.message_id ? { ...m, reactions: data.reactions } : m
            )
          );
          if (soundEnabled) playAudioTone("react");
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    return () => {
      ws.close();
    };
  }, [currentRoom, isJoined, username, avatarSeed, statusMood, wsProtocol, backendHost, soundEnabled]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Joining
  const handleJoinChat = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    const persona = {
      username: username.trim(),
      avatarSeed,
      statusMood
    };
    localStorage.setItem("tuko_user", JSON.stringify(persona));
    setIsJoined(true);
    if (soundEnabled) playAudioTone("send");
  };

  // Handle Typing notification
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", is_typing: true }));

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "typing", is_typing: false }));
        }
      }, 1500);
    }
  };

  // Send Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const payload = {
      type: "message",
      text: inputText.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`,
      status_mood: statusMood
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      if (soundEnabled) playAudioTone("send");
    } else {
      // Fallback HTTP
      fetch(`${backendBaseUrl}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: currentRoom,
          sender: username,
          text: inputText.trim(),
          avatar: payload.avatar,
          status_mood: payload.status_mood
        })
      })
        .then((res) => res.json())
        .then((msg) => {
          setMessages((prev) => [...prev, msg]);
          if (soundEnabled) playAudioTone("send");
        })
        .catch((err) => console.error("Send error:", err));
    }

    setInputText("");
  };

  // React to message
  const handleAddReaction = (messageId, emoji) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "reaction",
          message_id: messageId,
          emoji
        })
      );
    }
  };

  // Create Channel
  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomData.name.trim()) return;
    const cleanId = newRoomData.name.toLowerCase().replace(/\s+/g, "-");
    const payload = {
      id: cleanId,
      name: newRoomData.name.trim(),
      desc: newRoomData.desc.trim() || "Community channel"
    };

    fetch(`${backendBaseUrl}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((newRoom) => {
        setRooms((prev) => [...prev, newRoom]);
        setCurrentRoom(newRoom.id);
        setNewRoomModalOpen(false);
        setNewRoomData({ id: "", name: "", desc: "" });
      })
      .catch((err) => console.error("Create room error:", err));
  };

  const handleLogout = () => {
    localStorage.removeItem("tuko_user");
    setIsJoined(false);
    setUsername("");
    if (wsRef.current) wsRef.current.close();
  };

  // Filter messages by search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter((m) =>
      m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  // Active typing indicator text
  const currentlyTyping = Object.keys(typingUsers).filter((u) => typingUsers[u]);

  // =========================================================================
  // VIEW 1: IMMERSIVE ONBOARDING & LOGIN HERO
  // =========================================================================
  if (!isJoined) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Glowing Ambient Gradient Blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
          {/* Left Column: Hero & Interactive Feature Showcase */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time WebSocket Engine 2.0</span>
            </div>

            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                Connect. Chat. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400">
                  Experience TUKO.
                </span>
              </h1>
              <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
                Step into responsive multi-channel chatrooms with instant messaging, live emoji reactions, audio synthesis, and custom persona avatars.
              </p>
            </div>

            {/* Mock Chat Card with animated chat previews */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-500 ml-2 font-mono">live-preview #general</span>
              </div>

              <div className="flex items-start gap-2.5">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aria"
                  alt="Aria"
                  className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 mt-0.5"
                />
                <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-3 py-2 text-xs text-slate-200">
                  <p className="font-semibold text-sky-400 text-[10px]">Aria • 🎧 Lo-Fi Vibes</p>
                  <span>Did you see the new emoji reactions and dark mode? 🔥</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 flex-row-reverse">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Kai"
                  alt="Kai"
                  className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 mt-0.5"
                />
                <div className="bg-sky-600 rounded-2xl rounded-tr-none px-3 py-2 text-xs text-white">
                  <p className="font-semibold text-sky-200 text-[10px] text-right">Kai • 🚀 In the Zone</p>
                  <span>Yeah! Sub-millisecond WebSocket transit is unreal ⚡</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Installation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mobile 100dvh Layout</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Sound Synthesis</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Render Production Ready</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sleek Glassmorphic Login & Persona Customizer */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Create Your Persona</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Choose your identity and enter the chat</p>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? "Mute Audio" : "Enable Audio"}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                </button>
              </div>

              <form onSubmit={handleJoinChat} className="space-y-5">
                {/* Avatar Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Select Avatar
                    </label>
                    <button
                      type="button"
                      onClick={() => setAvatarSeed(`user-${Date.now()}`)}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Randomize
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
                      alt="Avatar preview"
                      className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-sky-500 shadow-md p-0.5"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">Active Identity</span>
                      <span className="text-[11px] text-slate-400">Seed: {avatarSeed}</span>
                    </div>
                  </div>

                  {/* Avatar choices pills */}
                  <div className="grid grid-cols-4 gap-2">
                    {AVATAR_SEEDS.map((seed) => {
                      const isSelected = avatarSeed === seed;
                      return (
                        <button
                          key={seed}
                          type="button"
                          onClick={() => setAvatarSeed(seed)}
                          className={`p-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                            isSelected
                              ? "bg-sky-500/20 border-sky-500 scale-105 shadow-sm shadow-sky-500/30"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                            alt={seed}
                            className="w-8 h-8 rounded-lg"
                          />
                          <span className="text-[10px] text-slate-300 truncate w-full text-center">
                            {seed}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Display Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Tanu, CyberWarrior"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all placeholder:text-slate-600"
                  />
                </div>

                {/* Status / Mood Tag */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Your Current Mood / Status
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MOOD_TAGS.map((tag) => {
                      const isSelected = statusMood === tag;
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setStatusMood(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            isSelected
                              ? "bg-sky-600 border-sky-400 text-white shadow-sm"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Enter Button */}
                <button
                  type="submit"
                  disabled={!username.trim()}
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-sky-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <span>Launch TUKO Workspace</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FULL-FEATURED CHAT WORKSPACE
  // =========================================================================
  return (
    <div className="flex h-[100dvh] w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* LEFT SIDEBAR: Channels & Search */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">TUKO</span>
              <span className="block text-[10px] text-emerald-400 font-medium">● 2.0 Live</span>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-800/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in chat..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Channel Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-2 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Channels</span>
            <button
              onClick={() => setNewRoomModalOpen(true)}
              title="Create Custom Channel"
              className="p-1 hover:bg-slate-800 rounded text-sky-400 hover:text-sky-300"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {rooms.map((room) => {
            const isActive = currentRoom === room.id;
            return (
              <button
                key={room.id}
                onClick={() => {
                  setCurrentRoom(room.id);
                  setMobileNavOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2.5 ${
                  isActive
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/25 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Hash className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                <div className="flex-1 truncate">
                  <div className="truncate">{room.name}</div>
                  <div className={`text-[10px] truncate ${isActive ? "text-sky-100" : "text-slate-500"}`}>
                    {room.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* User Account Bar */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
              alt={username}
              className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0"
            />
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{username}</p>
              <p className="text-[10px] text-sky-400 truncate">{statusMood}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Audio On" : "Audio Muted"}
              className="p-1.5 text-slate-400 hover:text-sky-400 rounded-lg"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-600" />}
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-[100dvh] w-full overflow-hidden bg-slate-950">
        {/* Chat Top Header */}
        <header className="h-16 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-sky-400" />
                <h2 className="font-bold text-sm sm:text-base text-white">
                  {rooms.find((r) => r.id === currentRoom)?.name || currentRoom}
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {rooms.find((r) => r.id === currentRoom)?.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isConnected
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-400"
              }`}
            >
              {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isConnected ? "Connected" : "Reconnecting..."}</span>
            </div>
          </div>
        </header>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-medium">No messages found</p>
              <p className="text-xs mt-1">Send a message to kick off the conversation!</p>
            </div>
          ) : (
            filteredMessages.map((msg, idx) => {
              if (msg.system) {
                return (
                  <div key={msg.id || idx} className="text-center my-3">
                    <span className="inline-block text-[11px] text-slate-400 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isMe = msg.sender === username;

              return (
                <div
                  key={msg.id || idx}
                  className={`flex gap-3 max-w-[92%] sm:max-w-[75%] group relative ${
                    isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <img
                    src={msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(msg.sender)}`}
                    alt={msg.sender}
                    className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 mt-1"
                  />

                  <div className="flex flex-col">
                    {/* Header info */}
                    <div className={`flex items-center gap-2 mb-1 text-xs ${isMe ? "justify-end" : "justify-start"}`}>
                      <span className="font-bold text-slate-300">{msg.sender}</span>
                      {msg.status_mood && (
                        <span className="text-[10px] text-sky-400/80 hidden sm:inline">
                          ({msg.status_mood})
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm break-words leading-relaxed shadow-sm relative ${
                        isMe
                          ? "bg-sky-600 text-white rounded-tr-none"
                          : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                      }`}
                    >
                      {msg.text}

                      {/* Hover Emoji Reaction Bar */}
                      <div
                        className={`absolute -top-7 hidden group-hover:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-full px-2 py-0.5 shadow-lg z-20 ${
                          isMe ? "right-0" : "left-0"
                        }`}
                      >
                        {EMOJI_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-xs p-0.5"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reactions display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-900 border border-slate-800 hover:border-sky-500 transition-colors"
                          >
                            <span>{emoji}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {currentlyTyping.length > 0 && (
          <div className="px-4 py-1 text-xs text-sky-400 flex items-center gap-1.5 italic bg-slate-900/40">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>{currentlyTyping.join(", ")} {currentlyTyping.length === 1 ? "is" : "are"} typing...</span>
          </div>
        )}

        {/* Quick Emoji Bar & Input Footer */}
        <footer className="p-3 sm:p-4 bg-slate-900/80 border-t border-slate-800/80 backdrop-blur-md">
          {/* Quick Reaction Pills */}
          <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Quick React:</span>
            {EMOJI_REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setInputText((prev) => prev + " " + e)}
                className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs transition-colors"
              >
                {e}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-5xl mx-auto">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Message #${rooms.find((r) => r.id === currentRoom)?.name || currentRoom}...`}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white p-3 rounded-xl transition-all shadow-md shadow-sky-600/25 active:scale-95 flex-shrink-0 font-medium"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </footer>
      </main>

      {/* CREATE NEW ROOM MODAL */}
      {newRoomModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Create New Channel</h3>
              <button
                onClick={() => setNewRoomModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  value={newRoomData.name}
                  onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                  placeholder="e.g. Design Systems"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Topic Description
                </label>
                <input
                  type="text"
                  value={newRoomData.desc}
                  onChange={(e) => setNewRoomData({ ...newRoomData, desc: e.target.value })}
                  placeholder="e.g. UI/UX and Tailwind discussions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewRoomModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
