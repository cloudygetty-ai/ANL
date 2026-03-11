// src/services/state/userStore.ts
import { create } from 'zustand';
import type { UserProfile } from '@types/index';

interface UserStore {
  profile: UserProfile | null;
  isAuthed: boolean;
  isOnboarded: boolean;

  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  setAuthed: (authed: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  isAuthed: false,
  isOnboarded: false,

  // WHY: setting profile always implies authentication succeeded
  setProfile: (profile) => set({ profile, isAuthed: true }),

  clearProfile: () => set({ profile: null, isAuthed: false }),

  setAuthed: (isAuthed) => set({ isAuthed }),

  setOnboarded: (isOnboarded) => set({ isOnboarded }),

  // WHY: guard against calling updateProfile before a profile exists —
  // silently no-ops rather than creating a partial object
  updateProfile: (updates) =>
    set((s) => ({
      profile: s.profile ? { ...s.profile, ...updates } : null,
    })),
}));
