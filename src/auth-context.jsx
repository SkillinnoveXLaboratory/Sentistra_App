import React, { createContext, useContext, useEffect, useState } from "react";
import { clearSession, saveSession, saveSessionUser, validateStoredSession } from "./api-client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [signupDraft, setSignupDraftState] = useState({});
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    validateStoredSession()
      .then((session) => setUser(session?.user || null))
      .finally(() => setSessionReady(true));
  }, []);

  const setSignupDraft = (updates) => {
    setSignupDraftState((current) => ({ ...current, ...updates }));
  };

  const setSession = async (session) => {
    await saveSession(session);
    setUser(session.user);
  };

  const logout = async () => {
    await clearSession();
    setUser(null);
  };

  const updateUser = async (updatedUser) => {
    await saveSessionUser(updatedUser);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, sessionReady, setSession, updateUser, logout, signupDraft, setSignupDraft }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
