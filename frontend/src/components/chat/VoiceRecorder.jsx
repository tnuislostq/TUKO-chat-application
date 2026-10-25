import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Trash2, Send, Loader2 } from "lucide-react";
import { api } from "../../services/api";

export default function VoiceRecorder({ onRecordComplete, onCancel }) {
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    let stream = null;

    const startRecording = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();

        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Microphone permission required to record voice notes.");
        onCancel();
      }
    };

    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onCancel]);

  const handleStopAndSend = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    setIsUploading(true);

    mediaRecorderRef.current.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
        const uploaded = await api.uploadFile(audioFile);

        onRecordComplete({
          url: uploaded.url,
          duration: recordingSeconds
        });
      } catch (err) {
        console.error("Upload voice note failed:", err);
        alert("Failed to upload voice note.");
      } finally {
        setIsUploading(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex items-center justify-between w-full px-4 py-2 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 rounded-2xl animate-in fade-in">
      {/* Recording status indicator */}
      <div className="flex items-center space-x-3">
        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
        <span className="text-sm font-semibold font-mono text-rose-600 dark:text-rose-400">
          {formatSeconds(recordingSeconds)}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
          Recording voice note...
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onCancel}
          disabled={isUploading}
          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
          title="Discard recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleStopAndSend}
          disabled={isUploading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow transition-all active:scale-95 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
