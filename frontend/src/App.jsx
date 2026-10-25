import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider, useSocket } from "./context/SocketContext";
import { CallProvider, useCall } from "./context/CallContext";
import { api } from "./services/api";
import { sounds } from "./services/sounds";

import Rail from "./components/layout/Rail";
import TopBar from "./components/layout/TopBar";
import ContextPanel from "./components/layout/ContextPanel";

import HomeView from "./components/views/HomeView";
import DirectMessagesSidebar from "./components/views/DirectMessagesSidebar";
import CommunitiesSidebar from "./components/views/CommunitiesSidebar";
import FriendsView from "./components/views/FriendsView";
import CallsView from "./components/views/CallsView";
import NotificationsView from "./components/views/NotificationsView";

import ChatArea from "./components/chat/ChatArea";
import IncomingCallModal from "./components/calls/IncomingCallModal";
import ActiveCallModal from "./components/calls/ActiveCallModal";

import AuthModal from "./components/modals/AuthModal";
import SettingsModal from "./components/modals/SettingsModal";
import CreateCommunityModal from "./components/modals/CreateCommunityModal";
import GlobalSearchModal from "./components/modals/GlobalSearchModal";
import NewChatModal from "./components/modals/NewChatModal";

function MainApp() {
  const { user, loading, refreshUser } = useAuth();
  const { sendWS, addListener, sendTyping, subscribeChannel, unsubscribeChannel } = useSocket();

  // Navigation state
  const [activeTab, setActiveTab] = useState("home"); // 'home', 'dms', 'friends', 'calls', 'communities', 'notifications'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [createCommunityModalOpen, setCreateCommunityModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);

  // Data states
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);

  const [communities, setCommunities] = useState([]);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [channelMessages, setChannelMessages] = useState([]);

  const [friends, setFriends] = useState([]);

  // Chat typing & replies
  const [typingMap, setTypingMap] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  // Require auth modal if not logged in
  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true);
    } else if (user) {
      setAuthModalOpen(false);
    }
  }, [user, loading]);

  // Load initial user data: conversations, communities, friends
  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const [convRes, commRes, friendsRes] = await Promise.all([
        api.getConversations(),
        api.getCommunities(),
        api.getFriends()
      ]);
      setConversations(convRes.conversations || []);
      setCommunities(commRes.communities || []);
      setFriends(friendsRes.friends || []);

      // If communities exist and none active, default to first
      if (commRes.communities && commRes.communities.length > 0 && !activeCommunity) {
        const firstComm = commRes.communities[0];
        setActiveCommunity(firstComm);
        const defaultChan = firstComm.channels?.find((c) => c.is_default) || firstComm.channels?.[0];
        setActiveChannel(defaultChan || null);
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    }
  }, [user, activeCommunity]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Load messages when active DM changes
  useEffect(() => {
    if (activeConversation) {
      api.getDMMessages(activeConversation.id)
        .then((res) => setDmMessages(res.messages || []))
        .catch((err) => console.error(err));
    } else {
      setDmMessages([]);
    }
  }, [activeConversation]);

  // Load messages and subscribe when active Channel changes
  useEffect(() => {
    if (activeCommunity && activeChannel && activeChannel.type === "text") {
      subscribeChannel(activeCommunity.id, activeChannel.id);
      api.getChannelMessages(activeCommunity.id, activeChannel.id)
        .then((res) => setChannelMessages(res.messages || []))
        .catch((err) => console.error(err));

      return () => {
        unsubscribeChannel(activeCommunity.id, activeChannel.id);
      };
    } else {
      setChannelMessages([]);
    }
  }, [activeCommunity, activeChannel, subscribeChannel, unsubscribeChannel]);

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setGlobalSearchOpen(false);
        setSettingsModalOpen(false);
        setCreateCommunityModalOpen(false);
        setNewChatModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // WebSocket Event Listeners
  useEffect(() => {
    const unsubs = [];

    // DM New Message
    unsubs.push(
      addListener("new_dm_message", (data) => {
        if (data.conversation_id === activeConversation?.id) {
          setDmMessages((prev) => [...prev, data.message]);
        }
        if (data.message.sender_id !== user?.id) {
          sounds.playTone("receive");
        } else {
          sounds.playTone("send");
        }
        // Update conversation preview
        setConversations((prev) =>
          prev.map((c) =>
            c.id === data.conversation_id
              ? {
                  ...c,
                  last_message: {
                    id: data.message.id,
                    sender_id: data.message.sender_id,
                    text: data.message.text || "Attachment",
                    created_at: data.message.created_at
                  }
                }
              : c
          )
        );
      })
    );

    // DM Reaction Updated
    unsubs.push(
      addListener("dm_reaction_updated", (data) => {
        setDmMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id ? { ...m, reactions: data.reactions } : m
          )
        );
      })
    );

    // DM Message Edited
    unsubs.push(
      addListener("dm_message_edited", (data) => {
        setDmMessages((prev) =>
          prev.map((m) => (m.id === data.message.id ? data.message : m))
        );
      })
    );

    // DM Message Deleted
    unsubs.push(
      addListener("dm_message_deleted", (data) => {
        setDmMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id
              ? { ...m, text: "This message was deleted.", is_deleted: true }
              : m
          )
        );
      })
    );

    // DM Message Pinned
    unsubs.push(
      addListener("dm_message_pinned", (data) => {
        setDmMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id ? { ...m, pinned: data.pinned } : m
          )
        );
      })
    );

    // Channel New Message
    unsubs.push(
      addListener("new_channel_message", (data) => {
        if (
          data.community_id === activeCommunity?.id &&
          data.channel_id === activeChannel?.id
        ) {
          setChannelMessages((prev) => [...prev, data.message]);
        }
        if (data.message.sender_id !== user?.id) {
          sounds.playTone("receive");
        } else {
          sounds.playTone("send");
        }
      })
    );

    // Channel Reaction Updated
    unsubs.push(
      addListener("channel_reaction_updated", (data) => {
        setChannelMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id ? { ...m, reactions: data.reactions } : m
          )
        );
      })
    );

    // Channel Message Edited
    unsubs.push(
      addListener("channel_message_edited", (data) => {
        setChannelMessages((prev) =>
          prev.map((m) => (m.id === data.message.id ? data.message : m))
        );
      })
    );

    // Channel Message Deleted
    unsubs.push(
      addListener("channel_message_deleted", (data) => {
        setChannelMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id
              ? { ...m, text: "This message was deleted.", is_deleted: true }
              : m
          )
        );
      })
    );

    // Channel Message Pinned
    unsubs.push(
      addListener("channel_message_pinned", (data) => {
        setChannelMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id ? { ...m, pinned: data.pinned } : m
          )
        );
      })
    );

    // User Typing in DM
    unsubs.push(
      addListener("user_typing", (data) => {
        if (data.conversation_id === activeConversation?.id && data.user_id !== user?.id) {
          setTypingMap((prev) => ({
            ...prev,
            [data.conversation_id]: data.is_typing ? `${data.username} is typing...` : ""
          }));
        }
      })
    );

    // Channel Typing
    unsubs.push(
      addListener("channel_typing", (data) => {
        if (
          data.community_id === activeCommunity?.id &&
          data.channel_id === activeChannel?.id &&
          data.user_id !== user?.id
        ) {
          setTypingMap((prev) => ({
            ...prev,
            [data.channel_id]: data.is_typing ? `${data.username} is typing...` : ""
          }));
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [addListener, activeConversation, activeCommunity, activeChannel, user]);

  // Actions: Send DM Message
  const handleSendDM = async (payload) => {
    if (!activeConversation) return;
    try {
      await api.sendDMMessage(activeConversation.id, payload);
    } catch (err) {
      alert("Failed to send message: " + err.message);
    }
  };

  // Actions: Send Channel Message
  const handleSendChannelMessage = async (payload) => {
    if (!activeCommunity || !activeChannel) return;
    try {
      await api.sendChannelMessage(activeCommunity.id, activeChannel.id, payload);
    } catch (err) {
      alert("Failed to send message: " + err.message);
    }
  };

  // Actions: React to DM message
  const handleReactDM = async (msgId, emoji) => {
    if (!activeConversation) return;
    sounds.playTone("react");
    try {
      await api.reactDMMessage(activeConversation.id, msgId, emoji);
    } catch (err) {
      console.error(err);
    }
  };

  // Actions: React to Channel message
  const handleReactChannel = async (msgId, emoji) => {
    if (!activeCommunity || !activeChannel) return;
    sounds.playTone("react");
    try {
      await api.reactChannelMessage(activeCommunity.id, activeChannel.id, msgId, emoji);
    } catch (err) {
      console.error(err);
    }
  };

  // Start DM from User selection
  const handleStartDMWithUser = async (targetUser) => {
    try {
      const res = await api.getOrCreateDM(targetUser.id);
      const conv = res.conversation;
      setConversations((prev) => {
        if (!prev.some((c) => c.id === conv.id)) {
          return [conv, ...prev];
        }
        return prev;
      });
      setActiveConversation(conv);
      setActiveTab("dms");
      setMobileSidebarOpen(false);
    } catch (err) {
      alert("Failed to open chat: " + err.message);
    }
  };

  // Select Community from Search/Home
  const handleSelectCommunityFromNav = async (comm) => {
    try {
      const res = await api.getCommunityDetail(comm.id);
      setActiveCommunity(res.community);
      const defaultChan = res.community.channels?.find((c) => c.is_default) || res.community.channels?.[0];
      setActiveChannel(defaultChan || null);
      setActiveTab("communities");
      setMobileSidebarOpen(false);
    } catch (err) {
      // If user is not member, prompt to join
      if (err.message.includes("Join community first")) {
        try {
          const joined = await api.joinCommunityByInvite(comm.invite_code);
          handleSelectCommunityFromNav(joined.community);
        } catch (jErr) {
          alert("Could not join community: " + jErr.message);
        }
      } else {
        alert(err.message);
      }
    }
  };

  // Active Pinned Messages
  const pinnedMessages = useMemo(() => {
    if (activeTab === "dms") {
      return dmMessages.filter((m) => m.pinned);
    } else if (activeTab === "communities") {
      return channelMessages.filter((m) => m.pinned);
    }
    return [];
  }, [activeTab, dmMessages, channelMessages]);

  const viewTitle = useMemo(() => {
    if (activeTab === "home") return "Dashboard";
    if (activeTab === "dms") return activeConversation?.other_user?.display_name || "Direct Messages";
    if (activeTab === "friends") return "Friends & Connections";
    if (activeTab === "calls") return "Voice & Video Calls";
    if (activeTab === "communities") return activeCommunity ? `# ${activeChannel?.name || activeCommunity.name}` : "Communities";
    if (activeTab === "notifications") return "Notifications";
    return "Tuko Chat";
  }, [activeTab, activeConversation, activeCommunity, activeChannel]);

  return (
    <div className="flex h-screen w-screen bg-slate-100 dark:bg-navy-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      {/* 1. Primary Compact Rail */}
      <Rail
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileSidebarOpen(false);
        }}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenSearch={() => setGlobalSearchOpen(true)}
        onOpenProfile={() => setSettingsModalOpen(true)}
      />

      {/* 2. Main Center Body */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Bar */}
        <TopBar
          currentViewTitle={viewTitle}
          onOpenSearch={() => setGlobalSearchOpen(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {/* Content Container (Secondary Sidebar + Chat Area / Views + Context Panel) */}
        <div className="flex-1 flex h-[calc(100%-3.5rem)] min-w-0 overflow-hidden relative">
          {/* HOME DASHBOARD */}
          {activeTab === "home" && (
            <HomeView
              friends={friends}
              communities={communities}
              onOpenDMs={() => setActiveTab("dms")}
              onOpenFriends={() => setActiveTab("friends")}
              onOpenCommunities={() => setActiveTab("communities")}
              onSelectCommunity={handleSelectCommunityFromNav}
              onSelectFriendChat={handleStartDMWithUser}
            />
          )}

          {/* DIRECT MESSAGES VIEW */}
          {activeTab === "dms" && (
            <>
              {/* Secondary DM Sidebar */}
              <div className={`${mobileSidebarOpen ? "block absolute inset-0 z-20" : "hidden md:block"}`}>
                <DirectMessagesSidebar
                  conversations={conversations}
                  activeConversationId={activeConversation?.id}
                  onSelectConversation={(conv) => {
                    setActiveConversation(conv);
                    setMobileSidebarOpen(false);
                  }}
                  onOpenNewChat={() => setNewChatModalOpen(true)}
                />
              </div>

              {/* Chat Area */}
              {activeConversation ? (
                <ChatArea
                  mode="dm"
                  title={activeConversation.other_user?.display_name || "Chat"}
                  subtitle={`@${activeConversation.other_user?.username || ""}`}
                  avatar={activeConversation.other_user?.avatar}
                  presence={activeConversation.other_user?.presence}
                  statusMood={activeConversation.other_user?.status_mood}
                  partner={activeConversation.other_user}
                  messages={dmMessages}
                  currentUserId={user?.id}
                  typingText={typingMap[activeConversation.id] || ""}
                  replyingTo={replyingTo}
                  onReply={(msg) => setReplyingTo(msg)}
                  onCancelReply={() => setReplyingTo(null)}
                  onSendMessage={handleSendDM}
                  onReact={handleReactDM}
                  onPin={(msgId) => api.pinDMMessage(activeConversation.id, msgId)}
                  onEdit={(msgId, text) => api.editDMMessage(activeConversation.id, msgId, text)}
                  onDelete={(msgId) => api.deleteDMMessage(activeConversation.id, msgId)}
                  onTyping={(isTyping) =>
                    sendTyping(isTyping, "dm", activeConversation.other_user?.id, {
                      conversationId: activeConversation.id
                    })
                  }
                  isContextPanelOpen={isContextPanelOpen}
                  onToggleContextPanel={() => setIsContextPanelOpen(!isContextPanelOpen)}
                />
              ) : (
                <div className="flex-1 hidden md:flex items-center justify-center p-6 text-center text-slate-400 bg-slate-50 dark:bg-navy-950">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Select a conversation or start a new chat</p>
                    <button
                      onClick={() => setNewChatModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-glow"
                    >
                      New Message
                    </button>
                  </div>
                </div>
              )}

              {/* Context Panel */}
              {isContextPanelOpen && activeConversation && (
                <ContextPanel
                  mode="dm"
                  partner={activeConversation.other_user}
                  pinnedMessages={pinnedMessages}
                  onClose={() => setIsContextPanelOpen(false)}
                />
              )}
            </>
          )}

          {/* COMMUNITIES VIEW */}
          {activeTab === "communities" && (
            <>
              {/* Secondary Communities Sidebar */}
              <div className={`${mobileSidebarOpen ? "block absolute inset-0 z-20" : "hidden md:block"}`}>
                <CommunitiesSidebar
                  communities={communities}
                  activeCommunity={activeCommunity}
                  activeChannel={activeChannel}
                  onSelectCommunity={(comm) => {
                    handleSelectCommunityFromNav(comm);
                    setMobileSidebarOpen(false);
                  }}
                  onSelectChannel={(chan) => {
                    setActiveChannel(chan);
                    setMobileSidebarOpen(false);
                  }}
                  onOpenCreateCommunity={() => setCreateCommunityModalOpen(true)}
                  onChannelCreated={(newChan) => {
                    setActiveCommunity((prev) => ({
                      ...prev,
                      channels: [...(prev?.channels || []), newChan]
                    }));
                    setActiveChannel(newChan);
                  }}
                />
              </div>

              {/* Channel Chat Area */}
              {activeCommunity && activeChannel && activeChannel.type === "text" ? (
                <ChatArea
                  mode="channel"
                  title={`# ${activeChannel.name}`}
                  subtitle={activeChannel.topic || activeCommunity.description}
                  channel={activeChannel}
                  community={activeCommunity}
                  messages={channelMessages}
                  currentUserId={user?.id}
                  typingText={typingMap[activeChannel.id] || ""}
                  replyingTo={replyingTo}
                  onReply={(msg) => setReplyingTo(msg)}
                  onCancelReply={() => setReplyingTo(null)}
                  onSendMessage={handleSendChannelMessage}
                  onReact={handleReactChannel}
                  onPin={(msgId) =>
                    api.pinChannelMessage(activeCommunity.id, activeChannel.id, msgId)
                  }
                  onEdit={(msgId, text) =>
                    api.editChannelMessage(activeCommunity.id, activeChannel.id, msgId, text)
                  }
                  onDelete={(msgId) =>
                    api.deleteChannelMessage(activeCommunity.id, activeChannel.id, msgId)
                  }
                  onTyping={(isTyping) =>
                    sendTyping(isTyping, "channel", activeChannel.id, {
                      communityId: activeCommunity.id
                    })
                  }
                  isContextPanelOpen={isContextPanelOpen}
                  onToggleContextPanel={() => setIsContextPanelOpen(!isContextPanelOpen)}
                />
              ) : (
                <div className="flex-1 hidden md:flex items-center justify-center p-6 text-center text-slate-400 bg-slate-50 dark:bg-navy-950">
                  <p className="text-sm">Select a text channel to join the conversation</p>
                </div>
              )}

              {/* Context Panel */}
              {isContextPanelOpen && activeCommunity && (
                <ContextPanel
                  mode="community"
                  community={activeCommunity}
                  pinnedMessages={pinnedMessages}
                  onClose={() => setIsContextPanelOpen(false)}
                />
              )}
            </>
          )}

          {/* FRIENDS VIEW */}
          {activeTab === "friends" && (
            <FriendsView onSelectFriendChat={handleStartDMWithUser} />
          )}

          {/* CALLS HISTORY VIEW */}
          {activeTab === "calls" && <CallsView />}

          {/* NOTIFICATIONS VIEW */}
          {activeTab === "notifications" && <NotificationsView />}
        </div>
      </div>

      {/* Global Modals & Calling Overlays */}
      <IncomingCallModal />
      <ActiveCallModal />

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      {settingsModalOpen && <SettingsModal onClose={() => setSettingsModalOpen(false)} />}
      {createCommunityModalOpen && (
        <CreateCommunityModal
          onClose={() => setCreateCommunityModalOpen(false)}
          onCommunityCreated={(newComm) => {
            setCommunities((prev) => [newComm, ...prev]);
            setActiveCommunity(newComm);
            setActiveChannel(newComm.channels?.[0] || null);
            setActiveTab("communities");
          }}
        />
      )}
      <GlobalSearchModal
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        onSelectUser={handleStartDMWithUser}
        onSelectCommunity={handleSelectCommunityFromNav}
        communities={communities}
      />
      <NewChatModal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        onSelectUser={handleStartDMWithUser}
        friends={friends}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
            <MainApp />
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
