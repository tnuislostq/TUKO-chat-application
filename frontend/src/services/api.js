// API Client for Tuko Chat

export const BACKEND_URL = 
  import.meta.env.VITE_BACKEND_URL || 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:8000" : window.location.origin);

export const WS_URL = BACKEND_URL.replace(/^http/, "ws");

class ApiService {
  getToken() {
    return localStorage.getItem("tuko_token") || "";
  }

  setToken(token) {
    if (token) {
      localStorage.setItem("tuko_token", token);
    } else {
      localStorage.removeItem("tuko_token");
    }
  }

  async request(endpoint, options = {}) {
    const url = `${BACKEND_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      ...(options.headers || {})
    };

    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errMessage = "An error occurred";
      try {
        const errorData = await response.json();
        errMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errMessage = response.statusText;
      }
      throw new Error(errMessage);
    }

    return response.json();
  }

  // --- Auth ---
  register(data) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  login(data) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  getMe() {
    return this.request("/api/auth/me");
  }

  updateProfile(data) {
    return this.request("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  searchUsers(query) {
    return this.request(`/api/auth/search?q=${encodeURIComponent(query)}`);
  }

  getUser(userId) {
    return this.request(`/api/auth/users/${userId}`);
  }

  // --- Friends ---
  getFriends() {
    return this.request("/api/friends");
  }

  getPendingFriends() {
    return this.request("/api/friends/pending");
  }

  sendFriendRequest(usernameOrId) {
    return this.request("/api/friends/request", {
      method: "POST",
      body: JSON.stringify({ username_or_id: usernameOrId })
    });
  }

  acceptFriendRequest(requestId) {
    return this.request(`/api/friends/${requestId}/accept`, {
      method: "POST"
    });
  }

  declineFriendRequest(requestId) {
    return this.request(`/api/friends/${requestId}/decline`, {
      method: "POST"
    });
  }

  removeFriend(friendId) {
    return this.request(`/api/friends/${friendId}`, {
      method: "DELETE"
    });
  }

  blockUser(targetId) {
    return this.request(`/api/friends/block/${targetId}`, {
      method: "POST"
    });
  }

  unblockUser(targetId) {
    return this.request(`/api/friends/unblock/${targetId}`, {
      method: "POST"
    });
  }

  getBlockedUsers() {
    return this.request("/api/friends/blocked");
  }

  // --- Conversations (DMs) ---
  getConversations() {
    return this.request("/api/conversations");
  }

  getOrCreateDM(userId) {
    return this.request(`/api/conversations/with/${userId}`, {
      method: "POST"
    });
  }

  getDMMessages(convId) {
    return this.request(`/api/conversations/${convId}/messages`);
  }

  sendDMMessage(convId, data) {
    return this.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  reactDMMessage(convId, msgId, emoji) {
    return this.request(`/api/conversations/${convId}/messages/${msgId}/react`, {
      method: "POST",
      body: JSON.stringify({ emoji })
    });
  }

  editDMMessage(convId, msgId, text) {
    return this.request(`/api/conversations/${convId}/messages/${msgId}`, {
      method: "PUT",
      body: JSON.stringify({ text })
    });
  }

  deleteDMMessage(convId, msgId) {
    return this.request(`/api/conversations/${convId}/messages/${msgId}`, {
      method: "DELETE"
    });
  }

  pinDMMessage(convId, msgId) {
    return this.request(`/api/conversations/${convId}/messages/${msgId}/pin`, {
      method: "POST"
    });
  }

  // --- Communities ---
  getCommunities() {
    return this.request("/api/communities");
  }

  getDiscoverableCommunities() {
    return this.request("/api/communities/discover");
  }

  createCommunity(data) {
    return this.request("/api/communities", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  getCommunityDetail(commId) {
    return this.request(`/api/communities/${commId}`);
  }

  joinCommunityByInvite(code) {
    return this.request(`/api/communities/join/${encodeURIComponent(code)}`, {
      method: "POST"
    });
  }

  createChannel(commId, data) {
    return this.request(`/api/communities/${commId}/channels`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  getChannelMessages(commId, chanId) {
    return this.request(`/api/communities/${commId}/channels/${chanId}/messages`);
  }

  sendChannelMessage(commId, chanId, data) {
    return this.request(`/api/communities/${commId}/channels/${chanId}/messages`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  reactChannelMessage(commId, chanId, msgId, emoji) {
    return this.request(`/api/communities/${commId}/channels/${chanId}/messages/${msgId}/react`, {
      method: "POST",
      body: JSON.stringify({ emoji })
    });
  }

  editChannelMessage(commId, chanId, msgId, text) {
    return this.request(`/api/communities/${commId}/channels/${chanId}/messages/${msgId}`, {
      method: "PUT",
      body: JSON.stringify({ text })
    });
  }

  deleteChannelMessage(commId, chanId, msgId) {
    return this.request(`/api/communities/${commId}/channels/${chanId}/messages/${msgId}`, {
      method: "DELETE"
    });
  }

  pinChannelMessage(commId, chanId, msgId) {
    return this.request(`/api/communities/${commId}/channels/${chanId}/messages/${msgId}/pin`, {
      method: "POST"
    });
  }

  // --- Calls & Logs ---
  getCallHistory() {
    return this.request("/api/calls/history");
  }

  getIceServers() {
    return this.request("/api/calls/ice-servers");
  }

  logCall(data) {
    return this.request("/api/calls/log", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  // --- Notifications ---
  getNotifications() {
    return this.request("/api/notifications");
  }

  markNotificationRead(notifId) {
    return this.request(`/api/notifications/${notifId}/read`, {
      method: "POST"
    });
  }

  markAllNotificationsRead() {
    return this.request("/api/notifications/read-all", {
      method: "POST"
    });
  }

  clearNotifications() {
    return this.request("/api/notifications", {
      method: "DELETE"
    });
  }

  // --- Uploads ---
  uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/api/uploads", {
      method: "POST",
      body: formData
    });
  }
}

export const api = new ApiService();
