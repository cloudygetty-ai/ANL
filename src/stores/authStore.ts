// src/stores/authStore.ts
// Bridge store — maps session state to interface expected by RootNavigator.
// Persists session in AsyncStorage so the user stays logged in across restarts.
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '@types/index';

interface AuthStore {
  user:           UserProfile | null;
  token:          string | null;
  isLoading:      boolean;
  setUser:        (user: UserProfile | null, token?: string) => void;
  restoreSession: () => Promise<void>;
  signOut:        () => Promise<void>;
}

const SESSION_KEY = 'anl_session_v1';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user:      null,
  token:     null,
  isLoading: true,

  setUser: (user, token) => {
    set({ user, token: token ?? get().token });
    if (user) {
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user, token })).catch(() => {});
    } else {
      AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    }
  },

  restoreSession: async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const { user, token } = JSON.parse(raw);
        set({ user, token });
      }
    } catch {}
    set({ isLoading: false });
  },

  signOut: async () => {
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    set({ user: null, token: null });
  },
}));
