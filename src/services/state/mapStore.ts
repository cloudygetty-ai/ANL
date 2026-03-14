// src/services/state/mapStore.ts
import { create } from 'zustand';
import type { MapUser, MapEvent, CameraState } from '@types/index';

type FilterGender = 'all' | 'f' | 'm' | 'tw' | 'tm';
type MapMode      = 'pins' | 'pulse';

interface MapStore {
  users:          MapUser[];
  events:         MapEvent[];
  selectedUser:   MapUser | null;
  filterGender:   FilterGender;
  mapMode:        MapMode;
  camera:         CameraState;
  setUsers:       (users: MapUser[]) => void;
  setEvents:      (events: MapEvent[]) => void;
  selectUser:     (user: MapUser | null) => void;
  setFilter:      (g: FilterGender) => void;
  setMapMode:     (m: MapMode) => void;
  setCamera:      (c: Partial<CameraState>) => void;
  filteredUsers:  () => MapUser[];
}

const DEFAULT_CAMERA: CameraState = {
  center:  { lat: 40.7128, lng: -74.006 },
  zoom:    14.5,
  pitch:   45,
  bearing: -15,
};

export const useMapStore = create<MapStore>((set, get) => ({
  users:        [],
  events:       [],
  selectedUser: null,
  filterGender: 'all',
  mapMode:      'pins',
  camera:       DEFAULT_CAMERA,

  setUsers:   (users)   => set({ users }),
  setEvents:  (events)  => set({ events }),
  selectUser: (user)    => set({ selectedUser: user }),
  setFilter:  (g)       => set({ filterGender: g }),
  setMapMode: (m)       => set({ mapMode: m }),
  setCamera:  (c)       => set((s) => ({ camera: { ...s.camera, ...c } })),

  filteredUsers: () => {
    const { users, filterGender } = get();
    if (filterGender === 'all') return users;
    return users.filter(u => u.gender === filterGender);
  },
}));
