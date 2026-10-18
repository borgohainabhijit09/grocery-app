import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, setApiToken } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/lib/storage";
import type { ApiUser } from "@/lib/types";

type AuthState = {
  user: ApiUser | null;
  initializing: boolean;
  signingIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function isStaff(user: ApiUser): boolean {
  return user.role === "ADMIN" || user.role === "STAFF";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
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
          if (!isStaff(me)) throw new Error("not staff");
          if (active) setUser(me);
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

  const signIn = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    try {
      const res = await api.login(email, password);
      if (!isStaff(res.user)) {
        throw new Error("This account does not have staff access.");
      }
      await setToken(res.token);
      setApiToken(res.token);
      setUser(res.user);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setApiToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { user: me } = await api.me();
    setUser(me);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, initializing, signingIn, signIn, signOut, refresh }),
    [user, initializing, signingIn, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
