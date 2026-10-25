import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import { api } from "../services/api";
import { sounds } from "../services/sounds";

const CallContext = createContext(null);

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

export function CallProvider({ children }) {
  const { user } = useAuth();
  const { sendWS, addListener } = useSocket();

  // 1-on-1 Call States
  // callState: 'idle' | 'calling' | 'connected'
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState("voice"); // 'voice' | 'video'
  const [partner, setPartner] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [duration, setDuration] = useState(0);

  // Media Controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Community Voice Room States
  const [activeVoiceRoom, setActiveVoiceRoom] = useState(null);
  const [voiceRoomUsers, setVoiceRoomUsers] = useState([]);
  const [isVoiceRoomMuted, setIsVoiceRoomMuted] = useState(false);

  // Streams & WebRTC references
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const durationTimerRef = useRef(null);
  const screenTrackRef = useRef(null);
  const voiceStreamRef = useRef(null);

  // Force re-renders for streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Clean up media streams helper
  const cleanupStreams = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    sounds.stopRinging();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;
    setRemoteStream(null);
    setCallState("idle");
    setPartner(null);
    setIncomingCall(null);
    setDuration(0);
    setIsScreenSharing(false);
  }, []);

  // Initialize WebRTC PeerConnection
  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && targetUserId) {
        sendWS({
          type: "webrtc_ice_candidate",
          target_id: targetUserId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        sounds.stopRinging();
        sounds.playTone("connect");
        setCallState("connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanupStreams();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [cleanupStreams, sendWS]);

  // Start 1-on-1 Call
  const startCall = async (targetUser, type = "voice") => {
    try {
      cleanupStreams();
      setCallType(type);
      setPartner(targetUser);
      setCallState("calling");
      sounds.startRinging();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video"
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(targetUser.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendWS({
        type: "webrtc_call_user",
        target_id: targetUser.id,
        call_type: type,
        sdp_offer: offer
      });
    } catch (err) {
      console.error("Start call failed:", err);
      cleanupStreams();
      alert("Could not access microphone/camera. Please check browser permissions.");
    }
  };

  // Accept Incoming Call
  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      sounds.stopRinging();
      const { caller, call_type, sdp_offer } = incomingCall;
      setCallType(call_type);
      setPartner(caller);
      setCallState("calling");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call_type === "video"
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(caller.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(sdp_offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendWS({
        type: "webrtc_accept_call",
        caller_id: caller.id,
        sdp_answer: answer
      });

      setIncomingCall(null);
      setCallState("connected");
      sounds.playTone("connect");

      // Start duration counter
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Accept call failed:", err);
      cleanupStreams();
    }
  };

  // Reject Incoming Call
  const rejectCall = () => {
    if (incomingCall) {
      sounds.stopRinging();
      sendWS({
        type: "webrtc_reject_call",
        caller_id: incomingCall.caller.id,
        call_type: incomingCall.call_type,
        reason: "declined"
      });
      setIncomingCall(null);
    }
  };

  // End Current Call
  const endCall = () => {
    if (partner) {
      sendWS({
        type: "webrtc_end_call",
        target_id: partner.id,
        duration,
        call_type: callType
      });
    }
    sounds.playTone("end");
    cleanupStreams();
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (peerConnectionRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }
        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
      }
    }
  };

  // --- Community Voice Room ---
  const joinVoiceRoom = async (communityId, channelId, channelName) => {
    try {
      leaveVoiceRoom();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      voiceStreamRef.current = stream;

      setActiveVoiceRoom({
        communityId,
        channelId,
        channelName
      });
      setVoiceRoomUsers([{ ...user, isSelf: true }]);

      sendWS({
        type: "voice_room_join",
        room_id: `${communityId}_${channelId}`
      });
      sounds.playTone("connect");
    } catch (err) {
      alert("Microphone permission required for voice room.");
    }
  };

  const leaveVoiceRoom = () => {
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach((t) => t.stop());
      voiceStreamRef.current = null;
    }
    if (activeVoiceRoom) {
      sendWS({ type: "voice_room_leave" });
      sounds.playTone("end");
    }
    setActiveVoiceRoom(null);
    setVoiceRoomUsers([]);
  };

  const toggleVoiceRoomMic = () => {
    if (voiceStreamRef.current) {
      const audioTrack = voiceStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsVoiceRoomMuted(!audioTrack.enabled);
      }
    }
  };

  // Socket Event Listeners for Calls
  useEffect(() => {
    const unsubs = [];

    // Incoming Call
    unsubs.push(
      addListener("webrtc_incoming_call", (data) => {
        sounds.startRinging();
        setIncomingCall(data);
      })
    );

    // Call Accepted
    unsubs.push(
      addListener("webrtc_call_accepted", async (data) => {
        sounds.stopRinging();
        sounds.playTone("connect");
        if (peerConnectionRef.current && data.sdp_answer) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp_answer));
          setCallState("connected");
          durationTimerRef.current = setInterval(() => {
            setDuration((prev) => prev + 1);
          }, 1000);
        }
      })
    );

    // Call Rejected
    unsubs.push(
      addListener("webrtc_call_rejected", () => {
        sounds.playTone("end");
        cleanupStreams();
      })
    );

    // Call Ended
    unsubs.push(
      addListener("webrtc_call_ended", () => {
        sounds.playTone("end");
        cleanupStreams();
      })
    );

    // ICE Candidate
    unsubs.push(
      addListener("webrtc_ice_candidate", async (data) => {
        if (peerConnectionRef.current && data.candidate) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        }
      })
    );

    // Voice Room Users
    unsubs.push(
      addListener("voice_user_joined", (data) => {
        if (data.user) {
          setVoiceRoomUsers((prev) => {
            if (prev.some((u) => u.id === data.user.id)) return prev;
            return [...prev, data.user];
          });
        }
      })
    );

    unsubs.push(
      addListener("voice_user_left", (data) => {
        setVoiceRoomUsers((prev) => prev.filter((u) => u.id !== data.user_id));
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [addListener, cleanupStreams]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        partner,
        incomingCall,
        duration,
        localStream,
        remoteStream,
        isMicMuted,
        isCameraOff,
        isScreenSharing,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        // Voice Room
        activeVoiceRoom,
        voiceRoomUsers,
        isVoiceRoomMuted,
        joinVoiceRoom,
        leaveVoiceRoom,
        toggleVoiceRoomMic
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
}
