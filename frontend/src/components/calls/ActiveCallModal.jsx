import React, { useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Maximize2,
  Minimize2,
  Volume2
} from "lucide-react";
import { useCall } from "../../context/CallContext";

export default function ActiveCallModal() {
  const {
    callState,
    callType,
    partner,
    duration,
    localStream,
    remoteStream,
    isMicMuted,
    isCameraOff,
    isScreenSharing,
    endCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === "idle" || !partner) return null;

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks()[0].enabled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-navy-950/90 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[700px] bg-navy-900 border border-navy-750 rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* Top Info Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 pointer-events-auto">
            <span className={`w-2.5 h-2.5 rounded-full ${callState === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"}`} />
            <span className="text-white text-xs font-semibold">
              {callState === "connected" ? formatDuration(duration) : "Calling..."}
            </span>
            <span className="text-white/60 text-xs">• {partner.display_name}</span>
          </div>
        </div>

        {/* Video / Call Center Area */}
        <div className="relative flex-1 bg-navy-950 flex items-center justify-center overflow-hidden">
          {/* Remote Video Stream */}
          {callType === "video" && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity ${
                callState === "connected" && hasRemoteVideo ? "opacity-100" : "opacity-0 absolute"
              }`}
            />
          )}

          {/* Fallback Audio Call UI or when Remote Video Off */}
          {(!hasRemoteVideo || callType === "voice" || callState === "calling") && (
            <div className="flex flex-col items-center justify-center space-y-4 text-center p-6 z-10">
              <div className="relative">
                <div className={`absolute inset-0 rounded-full bg-brand-500/30 ${callState === "calling" ? "animate-ping" : "animate-pulse"}`} />
                <img
                  src={partner.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.username}`}
                  alt={partner.display_name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-brand-500 relative z-10 shadow-2xl"
                />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {partner.display_name}
                </h3>
                <p className="text-xs text-brand-400 mt-0.5">@{partner.username}</p>
                <div className="text-xs text-slate-400 mt-2 font-mono">
                  {callState === "calling" ? "Ringing..." : "Connected"}
                </div>
              </div>
            </div>
          )}

          {/* Local Video PIP in bottom right */}
          {callType === "video" && !isCameraOff && (
            <div className="absolute bottom-4 right-4 w-32 sm:w-44 h-24 sm:h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            </div>
          )}
        </div>

        {/* Bottom Call Controls Toolbar */}
        <div className="h-20 bg-navy-900/90 backdrop-blur-md border-t border-navy-800 px-6 flex items-center justify-center space-x-4 sm:space-x-6 z-20">
          {/* Mute/Unmute Mic */}
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isMicMuted
                ? "bg-rose-500 text-white"
                : "bg-navy-800 hover:bg-navy-750 text-white border border-navy-700"
            }`}
            title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video Toggle */}
          {callType === "video" && (
            <button
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isCameraOff
                  ? "bg-rose-500 text-white"
                  : "bg-navy-800 hover:bg-navy-750 text-white border border-navy-700"
              }`}
              title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Screen Share */}
          {callType === "video" && (
            <button
              onClick={toggleScreenShare}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isScreenSharing
                  ? "bg-brand-600 text-white"
                  : "bg-navy-800 hover:bg-navy-750 text-white border border-navy-700"
              }`}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              <Monitor className="w-5 h-5" />
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
