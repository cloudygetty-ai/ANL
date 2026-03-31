/* eslint-disable @typescript-eslint/no-explicit-any */
// src/stores/socketStore.ts
// Zustand store for the Socket.IO connection to the ANL WebRTC signaling server.
// All real-time events (call signaling, notifications) flow through this socket.
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketStore {
  socket:          Socket | null;
  isConnected:     boolean;
  unreadMatches:   number;
  unreadMessages:  number;

  connect:         (token: string) => void;
  disconnect:      () => void;
  setUnread:       (matches: number, messages: number) => void;
  incrementUnread: (type: 'match' | 'message') => void;
  clearUnread:     () => void;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket:         null,
  isConnected:    false,
  unreadMatches:  0,
  unreadMessages: 0,

  connect: (token: string) => {
    // Avoid duplicate connections
    if (get().socket?.connected) return;

    const socket = io(API_BASE, {
      auth:       { token },
      transports: ['websocket'],
      reconnection:       true,
      reconnectionDelay:  2000,
      reconnectionAttempts: 10,
    });

    socket.on('connect',    () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));

    // WHY: track unread counts for tab badge without needing to enter each screen
    socket.on('match:new',    () => set((s) => ({ unreadMatches:  s.unreadMatches  + 1 })));
    socket.on('message:new',  () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })));

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false });
  },

  setUnread: (matches, messages) =>
    set({ unreadMatches: matches, unreadMessages: messages }),

  incrementUnread: (type) =>
    set((s) =>
      type === 'match'
        ? { unreadMatches:  s.unreadMatches  + 1 }
        : { unreadMessages: s.unreadMessages + 1 }
    ),

  clearUnread: () => set({ unreadMatches: 0, unreadMessages: 0 }),
}));
