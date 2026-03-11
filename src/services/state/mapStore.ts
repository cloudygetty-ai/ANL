// src/services/state/mapStore.ts
import { create } from 'zustand';
import type { MapUser, MapEvent, CameraState, MapMode, GenderFilter } from '@types/index';

interface MapStore {
  users: MapUser[];
  events: MapEvent[];
  selectedUser: MapUser | null;
  filter: GenderFilter;
  mode: MapMode;
  camera: CameraState;

  setUsers: (users: MapUser[]) => void;
  setEvents: (events: MapEvent[]) => void;
  selectUser: (user: MapUser | null) => void;
  setFilter: (filter: GenderFilter) => void;
  setMode: (mode: MapMode) => void;
  setCamera: (camera: Partial<CameraState>) => void;
  // WHY: derived selector lives here rather than in a component so any
  // subscriber can get the filtered list without duplicating filter logic
  filteredUsers: () => MapUser[];
}

// Default camera centered on Manhattan — overridden once location resolves
const defaultCamera: CameraState = {
  latitude: 40.7128,
  longitude: -74.006,
  zoom: 13,
  pitch: 45,
  heading: 0,
};

export const useMapStore = create<MapStore>((set, get) => ({
  users: [],
  events: [],
  selectedUser: null,
  filter: 'all',
  mode: 'normal',
  camera: defaultCamera,

  setUsers: (users) => set({ users }),
  setEvents: (events) => set({ events }),
  selectUser: (selectedUser) => set({ selectedUser }),
  setFilter: (filter) => set({ filter }),
  setMode: (mode) => set({ mode }),

  // Merge partial camera updates so callers only need to specify what changed
  setCamera: (camera) => set((s) => ({ camera: { ...s.camera, ...camera } })),

  filteredUsers: () => {
    const { users, filter } = get();
    if (filter === 'all') return users;
    return users.filter((u) => u.gender === filter);
  },
}));
