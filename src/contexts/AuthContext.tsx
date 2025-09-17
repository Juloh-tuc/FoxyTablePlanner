// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getUser, saveUser, clearUser } from "../utils/storage";
import type { UserProfile } from "../utils/storage";

type AuthCtx = {
  user: UserProfile | null;
  login: (u: UserProfile) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => { setUser(getUser()); }, []);

  const login = (u: UserProfile) => { setUser(u); saveUser(u); };
  const logout = () => { setUser(null); clearUser(); };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
