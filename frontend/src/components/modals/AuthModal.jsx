import React, { useState } from "react";
import { Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import TukoLogo from "../layout/TukoLogo";

const AVATAR_SEEDS = ["Aria", "Kai", "Sora", "Sam", "Phoenix", "Nova", "Leo", "Maya"];

export default function AuthModal({ onClose }) {
  const { login, register, authError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form fields
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("Aria");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          username: username.trim().toLowerCase(),
          display_name: displayName.trim() || username.trim(),
          email: email.trim().toLowerCase(),
          password,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`
        });
      } else {
        await login(username.trim().toLowerCase(), password);
      }
      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoUsername) => {
    setUsername(demoUsername);
    setPassword("password123");
    setLoading(true);
    setError(null);
    try {
      try {
        await login(demoUsername, "password123");
      } catch (e) {
        await register({
          username: demoUsername,
          display_name: demoUsername.toUpperCase(),
          email: `${demoUsername}@tuko.chat`,
          password: "password123",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${demoUsername}`
        });
      }
      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-750 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header with Tuko Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <TukoLogo className="w-14 h-14" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isRegister ? "Join Tuko Chat" : "Welcome to Tuko"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            {isRegister
              ? "Create your account for lightning real-time messaging & voice rooms."
              : "Sign in to connect with friends, communities, and voice channels."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-navy-850 rounded-2xl border border-slate-200 dark:border-navy-750 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              !isRegister
                ? "bg-white dark:bg-navy-750 text-brand-600 dark:text-brand-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              isRegister
                ? "bg-white dark:bg-navy-750 text-brand-600 dark:text-brand-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {(error || authError) && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs text-center font-medium">
            {error || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar seed selector if registering */}
          {isRegister && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Choose an Avatar
              </label>
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                {AVATAR_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setSelectedAvatar(seed)}
                    className={`relative shrink-0 rounded-full p-0.5 transition-all ${
                      selectedAvatar === seed
                        ? "ring-2 ring-brand-500 scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                      alt={seed}
                      className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-navy-800"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_dev"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Display Name (Register only) */}
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>
          )}

          {/* Email (Register only) */}
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-navy-850 border border-slate-200 dark:border-navy-750 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-glow flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? "Create Account" : "Sign In to Tuko"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="pt-2 border-t border-slate-200 dark:border-navy-750 text-center space-y-2">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Or Quick Test Persona
          </span>
          <div className="flex items-center justify-center space-x-2">
            <button
              type="button"
              onClick={() => handleDemoLogin("alice")}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-navy-700 transition-colors"
            >
              Demo: Alice
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("bob")}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-navy-700 transition-colors"
            >
              Demo: Bob
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
