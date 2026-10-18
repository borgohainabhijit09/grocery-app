import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, setApiToken } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/lib/storage";
import type { ApiUser } from "@/lib/types";

type AuthState = {
  user: ApiUser | null;
  initializing: boolean;
  signingIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  signInWithOtp: (phone: string, code: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: ApiUser) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<ApiUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await getToken();
      if (stored) {
        setApiToken(stored);
        try {
          const { user: me } = await api.me();
          if (active) setUserState(me);
        } catch {
          await clearToken();
          setApiToken(null);
        }
      }
      if (active) setInitializing(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (token: string, nextUser: ApiUser) => {
    await setToken(token);
    setApiToken(token);
    setUserState(nextUser);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setSigningIn(true);
      try {
        const res = await api.login(email, password);
        await persist(res.token, res.user);
      } finally {
        setSigningIn(false);
      }
    },
    [persist]
  );

  const signUp = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      setSigningIn(true);
      try {
        const res = await api.register(input);
        await persist(res.token, res.user);
      } finally {
        setSigningIn(false);
      }
    },
    [persist]
  );

  const signInWithOtp = useCallback(
    async (phone: string, code: string, name?: string) => {
      setSigningIn(true);
      try {
        const res = await api.otpVerify(phone, code, name);
        await persist(res.token, res.user);
      } finally {
        setSigningIn(false);
      }
    },
    [persist]
  );

  const signOut = useCallback(async () => {
    await clearToken();
    setApiToken(null);
    setUserState(null);
  }, []);

  const refresh = useCallback(async () => {
    const { user: me } = await api.me();
    setUserState(me);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      signingIn,
      signIn,
      signUp,
      signInWithOtp,
      signOut,
      refresh,
      setUser: setUserState,
    }),
    [user, initializing, signingIn, signIn, signUp, signInWithOtp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
