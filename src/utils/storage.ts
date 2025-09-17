// src/utils/storage.ts
export type UserProfile = { name: string; avatarUrl?: string };

const KEY = "ft_user";

export const saveUser = (u: UserProfile) =>
  localStorage.setItem(KEY, JSON.stringify(u));

export const getUser = (): UserProfile | null => {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
  catch { return null; }
};

export const clearUser = () => localStorage.removeItem(KEY);
