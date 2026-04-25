// src/stores/socketStore.ts
// Real-time socket state consumed by RootNavigator and tab badge counters.
import { create } from 'zustand';

// Loose Socket type to avoid hard dep on socket.io-client types
type AnySocket = any;

interface SocketStore {
  socket:          AnySocket | null;
  isConnected:     boolean;
  unreadMatches:   number;
  unreadMessages:  number;
  setSocket:       (socket: AnySocket | null) => void;
  setConnected:    (v: boolean) => void;
  incrementUnread: (type: 'match' | 'message') => void;
  clearUnread:     () => void;
  connect:         (token: string) => void;
  disconnect:      () => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket:         null,
  isConnected:    false,
  unreadMatches:  0,
  unreadMessages: 0,

  setSocket:    (socket)  => set({ socket }),
  setConnected: (v)       => set({ isConnected: v }),

  incrementUnread: (type) => set((s) =>
    type === 'match'
      ? { unreadMatches: s.unreadMatches + 1 }
      : { unreadMessages: s.unreadMessages + 1 }
  ),
  clearUnread: () => set({ unreadMatches: 0, unreadMessages: 0 }),

  connect: (token: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { io } = require('socket.io-client');
      const url = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
      const socket = io(url, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      socket.on('connect',    () => set({ isConnected: true }));
      socket.on('disconnect', () => set({ isConnected: false }));
      socket.on('match:new',  () => get().incrementUnread('match'));
      socket.on('chat:message', () => get().incrementUnread('message'));

      set({ socket });
    } catch {
      // socket.io-client not available in Expo Go — silently skip
    }
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false });
  },
}));
