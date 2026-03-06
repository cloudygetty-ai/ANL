// src/services/state/userStore.ts
import { create } from 'zustand';
import type { UserProfile } from '@types/index';

interface UserStore {
  profile:      UserProfile | null;
  isAuthed:     boolean;
  isOnboarded:  boolean;
  setProfile:   (p: UserProfile) => void;
  updateProfile:(updates: Partial<UserProfile>) => void;
  setAuthed:    (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  reset:        () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  profile:     null,
  isAuthed:    false,
  isOnboarded: false,

  setProfile:    (profile)  => set({ profile, isAuthed: true }),
  updateProfile: (updates)  => set((s) => ({
    profile: s.profile ? { ...s.profile, ...updates } : null,
  })),
  setAuthed:    (isAuthed)    => set({ isAuthed }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  reset: () => set({ profile: null, isAuthed: false, isOnboarded: false }),
}));
