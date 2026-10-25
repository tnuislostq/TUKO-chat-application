import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { WS_URL, api } from "../services/api";
import { useAuth } from "./AuthContext";
import { sounds } from "../services/sounds";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlinePresence, setOnlinePresence] = useState({});
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);

  const addListener = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(callback);
    return () => {
      const set = listenersRef.current.get(type);
      if (set) {
        set.delete(callback);
      }
    };
  }, []);

  const sendWS = useCallback((data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const connect = useCallback(() => {
    const token = api.getToken();
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setIsConnected(false);
      return;
    }

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("⚡ Tuko WebSocket connected.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type } = data;

        // Presence tracking
        if (type === "presence_updated") {
          setOnlinePresence((prev) => ({
            ...prev,
            [data.user_id]: {
              presence: data.presence,
              status_mood: data.status_mood
            }
          }));
        }

        // Notification chime
        if (type === "notification") {
          sounds.playTone("notification");
        }

        // Dispatch to registered event listeners
        const handlers = listenersRef.current.get(type);
        if (handlers) {
          handlers.forEach((fn) => {
            try {
              fn(data);
            } catch (err) {
              console.error(`Error in listener for ${type}:`, err);
            }
          });
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected. Retrying in 3s...");
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.warn("WebSocket error:", err);
      ws.close();
    };
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendTyping = useCallback((isTyping, targetType, targetId, extra = {}) => {
    if (targetType === "dm") {
      sendWS({
        type: "typing",
        target_type: "dm",
        recipient_id: targetId,
        conversation_id: extra.conversationId,
        is_typing: isTyping
      });
    } else if (targetType === "channel") {
      sendWS({
        type: "typing",
        target_type: "channel",
        community_id: extra.communityId,
        channel_id: targetId,
        is_typing: isTyping
      });
    }
  }, [sendWS]);

  const subscribeChannel = useCallback((communityId, channelId) => {
    sendWS({
      type: "subscribe_channel",
      community_id: communityId,
      channel_id: channelId
    });
  }, [sendWS]);

  const unsubscribeChannel = useCallback((communityId, channelId) => {
    sendWS({
      type: "unsubscribe_channel",
      community_id: communityId,
      channel_id: channelId
    });
  }, [sendWS]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        onlinePresence,
        sendWS,
        addListener,
        sendTyping,
        subscribeChannel,
        unsubscribeChannel
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
