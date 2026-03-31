/* eslint-disable @typescript-eslint/no-explicit-any */
// src/stores/authStore.ts
// Zustand store for authentication state.
// Wraps Supabase auth — persists session across app restarts via AsyncStorage.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Minimal user shape stored in auth — full profile is in userStore
export interface AuthUser {
  id:                string;
  phone:             string;
  token:             string;
  subscriptionTier:  'free' | 'plus' | 'premium';
  subscriptionStatus?: string;
}

interface AuthStore {
  user:           AuthUser | null;
  isLoading:      boolean;
  isHydrated:     boolean;

  setUser:        (user: AuthUser) => void;
  updateUser:     (updates: Partial<AuthUser>) => void;
  signOut:        () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const SESSION_KEY = '@anl:auth_session';

export const useAuthStore = create<AuthStore>((set) => ({
  user:       null,
  isLoading:  false,
  isHydrated: false,

  setUser: (user) => {
    set({ user });
    // WHY: persist to AsyncStorage so restoreSession works after cold starts
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user)).catch(() => {});
  },

  updateUser: (updates) =>
    set((s) => {
      if (!s.user) return {};
      const updated = { ...s.user, ...updates };
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated)).catch(() => {});
      return { user: updated };
    }),

  signOut: async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    set({ user: null });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const user = JSON.parse(raw) as AuthUser;
        set({ user });
      }
    } catch {
      // Corrupt storage — boot fresh
    } finally {
      set({ isLoading: false, isHydrated: true });
    }
  },
}));
