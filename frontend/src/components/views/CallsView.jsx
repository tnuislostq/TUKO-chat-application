import React, { useState, useEffect } from "react";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  RotateCcw
} from "lucide-react";
import { api } from "../../services/api";
import { useCall } from "../../context/CallContext";

export default function CallsView() {
  const { startCall } = useCall();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCallHistory()
      .then((res) => setHistory(res.history || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (secs) => {
    if (!secs) return "0s";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-navy-950 transition-colors overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-navy-800/80 px-6 flex items-center justify-between bg-white dark:bg-navy-900 shrink-0">
        <div className="flex items-center space-x-2 font-bold text-sm text-slate-800 dark:text-slate-100">
          <Phone className="w-5 h-5 text-brand-500" />
          <span>Call Logs & History</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-3xl mx-auto w-full space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400 bg-white dark:bg-navy-900 rounded-3xl border border-slate-200 dark:border-navy-800">
            <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No call history yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((call) => {
              const isMissed = call.status === "missed" || call.status === "declined";
              const partner = call.partner || { display_name: "User", username: "user" };

              return (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center space-x-3.5">
                    {/* Status icon */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isMissed
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {isMissed ? (
                        <PhoneMissed className="w-5 h-5" />
                      ) : call.is_outgoing ? (
                        <PhoneOutgoing className="w-5 h-5" />
                      ) : (
                        <PhoneIncoming className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                        <span>{partner.display_name}</span>
                        {call.call_type === "video" ? (
                          <Video className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="capitalize">{call.status}</span>
                        <span>•</span>
                        <span>{formatDuration(call.duration_seconds)}</span>
                        <span>•</span>
                        <span>
                          {new Date(call.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Call Back Button */}
                  {call.partner && (
                    <button
                      onClick={() => startCall(call.partner, call.call_type || "voice")}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-800 hover:bg-brand-600 hover:text-white text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                      title="Call back"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Call Back</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
