import React from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "../../context/CallContext";

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  const { caller, call_type } = incomingCall;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-navy-850 border border-slate-200 dark:border-navy-700 shadow-2xl text-center space-y-6">
        {/* Pulsing Avatar */}
        <div className="relative inline-block">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
          <img
            src={caller.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${caller.username}`}
            alt={caller.display_name}
            className="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-brand-500 relative z-10 shadow-lg"
          />
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {caller.display_name}
          </h3>
          <p className="text-xs text-brand-500 font-medium mt-1">
            @{caller.username}
          </p>
          <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
            {call_type === "video" ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span className="capitalize">Incoming {call_type} Call...</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center space-x-8 pt-2">
          {/* Decline */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
              title="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-xs text-slate-400 font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={acceptCall}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-bounce"
              title="Accept Call"
            >
              {call_type === "video" ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-xs text-slate-400 font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
