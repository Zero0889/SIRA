"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

type AuthContextValue = {
  user: AuthUser | null | undefined;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.me().then(
      (currentUser) => { if (active) setUser(currentUser); },
      () => { if (active) setUser(null); },
    );
    return () => { active = false; };
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    refresh,
    signOut,
  }), [refresh, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
