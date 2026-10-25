import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchCurrentUser = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      setUser(res.user);
      setUnreadNotifications(res.unread_notifications || 0);
    } catch (err) {
      console.error("Auth check failed:", err);
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (usernameOrEmail, password) => {
    setAuthError(null);
    try {
      const res = await api.login({
        username_or_email: usernameOrEmail,
        password
      });
      api.setToken(res.access_token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const register = async (data) => {
    setAuthError(null);
    try {
      const res = await api.register(data);
      api.setToken(res.access_token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const updateProfile = async (updates) => {
    try {
      const res = await api.updateProfile(updates);
      setUser(res.user);
      return res.user;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        unreadNotifications,
        setUnreadNotifications,
        login,
        register,
        logout,
        updateProfile,
        refreshUser: fetchCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
